// Libraries
var $ = require('jquery-detached').getJQuery();
var bootstrap = require('bootstrap-detached').getBootstrap();
var cryptoJSMD5 = require("crypto-js/md5");
var handlebars = require("handlebars");
var moment = require('moment');
var numeral = require('numeral');

// Own libraries
var Storage = require('./storage.js');

// API Endpoints
var issuesAPI = "../issues-api/api/json?tree=issues[id,priority,message,origin,state[state]]";
var testResultsAPI = "../lastCompletedBuild/testReport/api/json?tree=duration,failCount,passCount,skipCount,empty";

// Handlebars templates & partials
var changesetTemplate = require('./handlebars/changeset.hbs');
var buildTemplate = require('./handlebars/build.hbs');
var issueRowTemplate = require('./handlebars/issue.hbs');
var buildInfoTemplate = require('./handlebars/buildinfo.hbs');
var healthReportTemplate = require('./handlebars/healthreport.hbs');
handlebars.registerPartial('changeset', changesetTemplate);
handlebars.registerPartial('healthreport', healthReportTemplate);

// storage for current job/project name
var projectId;
var projectStorage;

// Issues Table
function issuesTable() {
    $.getJSON(issuesAPI)
        .done(function (data) {
            $("#codehealth-issues").empty();
            $.each(data.issues, function (i, issue) {
                // add to table
                var linkHref = "../issues-api/goToBuildResult?origin=" + issue.origin;
                var row = issueRowTemplate({
                    linkHref: linkHref,
                    issue: issue
                });
                $('#codehealth-issues').append(row);
            });
        });
}

function updateLoCandDuplicates() {
    var updateLoCGraph = require('./graphs/loc.js');
    updateLoCGraph('loc', 'dup');
}

function updateIssuesGraph() {
    var updateIssues = require('./graphs/issues.js');
    updateIssues('issues-graph', projectStorage.get('issues.showTable'));
}

function compareChangeSet(a, b) {
    if (!a.timestamp && !b.timestamp) {
        if (a.timestamp > b.timestamp) {
            return 1;
        } else if (a.timestamp < b.timestamp) {
            return -1;
        } else {
            return 0;
        }
    } else {
        if (!a.revision && !b.revision) {
            if (a.revision > b.revision) {
                return 1;
            } else if (a.revision < b.revision) {
                return -1;
            }
            else {
                return 0;
            }
        } else {
            return 0;
        }
    }
}

function updateChangesets() {
    console.log("[Changesets] Updating data...");
    var nrOfBuildsToShow = projectStorage.get("builds", 10);
    var changeSetAPI = "../api/json?tree=builds[number,timestamp,changeSet[items[msg,comment,author[id,fullName,property[address]],date,commitId]]]{0," + nrOfBuildsToShow + "}";
    // default image src is gravatar default image (if no mail specified)
    var gravatarSrc = "http://www.gravatar.com/avatar/default?f=y&s=64";
    var gravatarEnabled = projectStorage.get("gravatarEnabled", "true");
    $.getJSON(changeSetAPI)
        .done(function (data) {
            $("#changeset-container").empty();
            $.each(data.builds, function (buildIdx, build) {
                var changeSetsForBuild = [];
                var buildNr = build.number;
                var timestamp = build.timestamp;
                var changeSet = build.changeSet;
                $.each(changeSet.items, function (itemIdx, changeItem) {
                    var revision = changeItem.commitId;
                    var author = changeItem.author;
                    var date = changeItem.date;
                    var authorId = author.id;
                    var authorName = author.fullName;
                    var authorMail = "";
                    // find mail address
                    $.each(author.property, function (key, value) {
                        if (value.address) {
                            authorMail = value.address;
                            return false;
                        }
                    });
                    var msg = (changeItem.comment) ? changeItem.comment : changeItem.msg;
                    if (authorMail !== "") {
                        gravatarSrc = "http://www.gravatar.com/avatar/" + cryptoJSMD5(authorMail) + "?d=retro&s=64";
                    }
                    var momDate = null;
                    var timestamp = null;
                    if (date) {
                        // 2015-10-29 17:39:36 +0100
                        var parsedDate = moment(date, "YYYY.MM.DD HH:mm:ss ZZ");
                        momDate = parsedDate.calendar();
                        timestamp = parsedDate.format('x');
                    }
                    var singleChange = {
                        message: msg,
                        author: authorName,
                        authorId: authorId,
                        revision: revision,
                        gravatarSrc: gravatarSrc,
                        gravatarEnabled: gravatarEnabled,
                        date: momDate,
                        timestamp: timestamp,
                        changeHref: "../" + buildNr + "/changes#" + revision
                    };
                    changeSetsForBuild.push(singleChange);
                });
                if (changeSetsForBuild.length > 0) {
                    changeSetsForBuild.sort(compareChangeSet).reverse();
                    var buildRes = buildTemplate({
                        number: buildNr,
                        timestamp: moment(new Date(timestamp)).calendar(),
                        changesets: changeSetsForBuild
                    });
                    $("#changeset-container").append(buildRes);
                }
            });
        });
    console.log("[Changesets] Update finished.");
}

function updateBuildInfo() {
    var buildInfoAPI = "../api/json?tree=displayName,color,healthReport[description,score,iconUrl],lastBuild[actions[causes[shortDescription]],number,timestamp,url,result]";
    var $buildInfoDiv = $('#build-info-content');
    $buildInfoDiv.empty();
    var baseResourceUrl = $('#resourceUrl').val();
    $.getJSON(buildInfoAPI)
        .done(function (data) {
            var healthReports = [];
            var causes = [];
            $.each(data.healthReport, function (idx, healthReport) {
                var report = {};
                report.iconUrl = baseResourceUrl + "/images/48x48/" + healthReport.iconUrl;
                report.description = healthReport.description;
                report.score = healthReport.score;
                healthReports.push(report);
            });
            $.each(data.lastBuild.actions, function (idx, action) {
                if (action.causes) {
                    $.each(action.causes, function (idx, cause) {
                        causes.push(cause.shortDescription);
                    });
                }
            });
            var lastBuild = data.lastBuild;
            lastBuild.time = moment(lastBuild.timestamp).format('DD.MM.YYYY HH:mm');
            var buildInfoRes = buildInfoTemplate({
                iconUrl: baseResourceUrl + "/images/48x48/" + data.color + ".png",
                displayName: data.displayName,
                lastBuild: lastBuild,
                causes: causes,
                healthreports: healthReports
            });
            $buildInfoDiv.append(buildInfoRes);

        });

}

function updateTestResults() {
    $('#test-content').empty();
    var testreportTemplate = require('./handlebars/testreport.hbs');
    $.getJSON(testResultsAPI).done(function (data) {
        var durationInSec = parseFloat(data.duration);
        var totalRunCount = data.passCount + data.failCount;
        var successPercentage = data.passCount / totalRunCount;
        var templateRendered = testreportTemplate({
            successPercentage: numeral(successPercentage).format('0.00%'),
            successTitle: data.passCount + ' tests passed.',
            duration: numeral(durationInSec).format('0.00') + ' s',
            passCount: numeral(data.passCount).format('0,0'),
            failCount: numeral(data.failCount).format('0,0'),
            skipCount: numeral(data.skipCount).format('0,0')
        });
        $('#test-content').append(templateRendered);
    });
}

function refreshData() {
    console.log("[Codehealth] Refreshing data...");
    issuesTable();
    updateLoCandDuplicates();
    updateIssuesGraph();
    updateChangesets();
    updateBuildInfo();
    updateTestResults();
}

/**
 * Register on-click event for save button in modal configuration dialog.
 */
function bindChangesetSaveButton() {
    $("#btSaveChangeset").click(function () {
        var builds = $("#shownBuildsInput").val();
        projectStorage.put("builds", builds);
        var gravatarEnabled = $("#cbGravatar").is(':checked');
        projectStorage.put("gravatarEnabled", gravatarEnabled ? "true" : "false");
        bootstrap("#modal-changeset").modal('hide');
    });
}

var refreshInterval;

/**
 * @param interval refresh interval in seconds (if 0 then refresh disabled)
 */
function registerAutoRefresh(interval) {
    if (interval > 0) {
        console.log("Activating automatic refresh.");
        refreshInterval = setInterval(refreshData, interval * 1000);
    } else {
        console.log("Disabled automatic refresh.");
        clearInterval(refreshInterval);
    }
}

/**
 * Register on-click event for save button in modal configuration dialog.
 */
function bindConfigurationSaveButton() {
    $("#btSaveConfig").click(function () {
        // always disable the auto refresh (so new time setting is used)
        registerAutoRefresh(0);
        var interval = 0;
        var refreshEnabled = $("#cbRefresh").is(':checked');
        if (refreshEnabled) {
            interval = parseInt($("#inputRefreshInterval").val());
            if (interval < 0) {
                interval = 0;
            }
        }
        projectStorage.put("refreshInterval", interval);
        registerAutoRefresh(interval);
        bootstrap("#modal-dashboard").modal('hide');
    });
}

function initChangesetModal() {
    bindChangesetSaveButton();
    $("#shownBuildsInput").val(projectStorage.get("builds", 10));
    if (projectStorage.toBoolean(projectStorage.get("gravatarEnabled", "true"))) {
        $("#cbGravatar").prop("checked", "checked");
    }
}

function initConfigurationModal() {
    bindConfigurationSaveButton();
    var interval = projectStorage.get("refreshInterval", 0);
    if (interval > 0) {
        $("#cbRefresh").prop("checked", "checked");
        $("#inputRefreshInterval").val(interval);
        registerAutoRefresh(interval);
    }
}

function bindIssuesSaveButton() {
    $("#btSaveIssueConfig").click(function () {
        var showTable = $("#cbShowTable").is(':checked');
        projectStorage.put("issues.showTable", showTable ? "true" : "false");
        bootstrap("#modal-issues").modal('hide');
    });
}

function initIssuesModal() {
    bindIssuesSaveButton();
    if (projectStorage.toBoolean(projectStorage.get("issues.showTable", "true"))) {
        $("#cbShowTable").prop("checked", "checked");
    }
}

function addFullscreenEvent(contentId, triggerId) {
    var goFullscreen = require('./fullscreen.js');
    $("#" + triggerId).click(function () {
        goFullscreen(contentId);
    });
}

function initModals() {
    initChangesetModal();
    initConfigurationModal();
    initIssuesModal();
}

$(document).ready(function () {
    // init storage
    projectId = $("#projectId").val();
    projectStorage = new Storage(projectId);
    initModals();
    addFullscreenEvent("main-panel", "dash-kiosk-btn");
    // remove empty Jenkins sidepanel
    $("#side-panel").remove();
    $("#main-panel").css("margin-left", "0px");
    // load data
    refreshData();
});