package org.jenkinsci.plugins.codehealth.action.issues;

import hudson.model.AbstractProject;
import hudson.model.TopLevelItem;
import hudson.util.HttpResponses;
import org.jenkinsci.plugins.codehealth.model.IssueEntity;
import org.jenkinsci.plugins.codehealth.model.State;
import org.jenkinsci.plugins.codehealth.provider.issues.IssueProvider;
import org.jenkinsci.plugins.codehealth.service.IssueRepository;
import org.jenkinsci.plugins.codehealth.service.JPAIssueRepository;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.QueryParameter;
import org.kohsuke.stapler.export.Exported;
import org.kohsuke.stapler.export.ExportedBean;

import java.util.*;

/**
 * {@link hudson.model.AbstractProject}-based Action to retrieve current issues for a project.
 *
 * @author Michael Prankl
 */
@ExportedBean
public class IssuesProjectAction extends AbstractIssuesAction {
    private transient AbstractProject abstractProject;
    private transient final List<State> newAndOpen = list(State.NEW, State.OPEN);

    public IssuesProjectAction(AbstractProject abstractProject, IssueRepository issueRepository) {
        super((TopLevelItem) abstractProject, issueRepository);
        this.abstractProject = abstractProject;
    }

    @Exported(name = "issues")
    public Collection<IssueEntity> getIssues() {
        final ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(getClass().getClassLoader());
        try {
            return getIssueRepository().loadIssues(getTopLevelItem(), newAndOpen);
        } finally {
            Thread.currentThread().setContextClassLoader(contextClassLoader);
        }
    }

    @Exported(name = "issuesPerOrigin")
    public Map<String, List<IssueEntity>> getIssuesPerOrigin() {
        Collection<IssueEntity> issues = getIssues();
        Map<String, List<IssueEntity>> map = new LinkedHashMap<String, List<IssueEntity>>();
        for (IssueEntity issue : issues) {
            String originPluginName = IssueProvider.findProvider(issue.getOrigin()).getOriginPluginName();
            List<IssueEntity> issueList = map.get(originPluginName) != null ? map.get(originPluginName) : new ArrayList<IssueEntity>();
            issueList.add(issue);
            map.put(originPluginName, issueList);
        }
        return map;
    }

    @Exported(name = "series")
    public Map<Integer, JPAIssueRepository.IssuesByPriority> getIssueCountPerBuild() {
        final ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(getClass().getClassLoader());
        try {
            return getIssueRepository().loadIssueCountPerBuild(getTopLevelItem());
        } finally {
            Thread.currentThread().setContextClassLoader(contextClassLoader);
        }
    }

    public HttpResponse doGoToBuildResult(@QueryParameter String origin) {
        IssueProvider provider = IssueProvider.findProvider(origin);
        return HttpResponses.redirectTo("../" + provider.getProjectResultUrlName());
    }

}
