package org.jenkinsci.plugins.codehealth.action;

import hudson.model.TopLevelItem;
import org.jenkinsci.plugins.codehealth.LinesOfCode;
import org.jenkinsci.plugins.codehealth.model.DuplicateCodeEntity;
import org.jenkinsci.plugins.codehealth.model.IssueEntity;
import org.jenkinsci.plugins.codehealth.model.LinesOfCodeEntity;
import org.jenkinsci.plugins.codehealth.model.State;
import org.jenkinsci.plugins.codehealth.service.DuplicateCodeRepository;
import org.jenkinsci.plugins.codehealth.service.IssueRepository;
import org.jenkinsci.plugins.codehealth.service.LinesOfCodeRepository;
import org.kohsuke.stapler.export.Exported;
import org.kohsuke.stapler.export.ExportedBean;

import java.util.Collection;

/**
 * {@link hudson.model.Run}-based Action for retrieving newly introduced and fixed issues for a build.
 *
 * @author Michael Prankl
 */
@ExportedBean
public class CodehealthBuildAction extends AbstractCodehealthAction {

    private int buildNr;

    public CodehealthBuildAction(int buildNr, TopLevelItem topLevelItem, IssueRepository issueRepository, LinesOfCodeRepository locRepository, DuplicateCodeRepository duplicateCodeRepository) {
        super(topLevelItem, issueRepository, locRepository, duplicateCodeRepository);
        this.buildNr = buildNr;
    }

    @Exported
    public Collection<IssueEntity> newIssues() {
        return getIssueRepository().loadIssues(getTopLevelItem(), this.buildNr, State.NEW);
    }

    @Exported
    public Collection<IssueEntity> fixedIssues() {
        return getIssueRepository().loadIssues(getTopLevelItem(), this.buildNr, State.CLOSED);
    }

    @Exported
    public LinesOfCodeEntity linesOfCode() {
        return getLocRepository().read(getTopLevelItem(), this.buildNr);
    }

    @Exported
    public DuplicateCodeEntity duplicateCode() {
        return getDuplicateCodeRepository().loadForBuild(getTopLevelItem(), this.buildNr);
    }
}
