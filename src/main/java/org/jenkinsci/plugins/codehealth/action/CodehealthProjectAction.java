package org.jenkinsci.plugins.codehealth.action;

import hudson.model.AbstractProject;
import hudson.model.TopLevelItem;
import org.jenkinsci.plugins.codehealth.model.IssueEntity;
import org.jenkinsci.plugins.codehealth.model.LinesOfCodeEntity;
import org.jenkinsci.plugins.codehealth.model.State;
import org.jenkinsci.plugins.codehealth.service.IssueRepository;
import org.jenkinsci.plugins.codehealth.service.LinesOfCodeRepository;
import org.kohsuke.stapler.export.Exported;
import org.kohsuke.stapler.export.ExportedBean;

import java.util.Collection;
import java.util.List;

/**
 * {@link hudson.model.AbstractProject}-based Action to retrieve current issues for a project.
 *
 * @author Michael Prankl
 */
@ExportedBean
public class CodehealthProjectAction extends AbstractCodehealthAction {
    private transient AbstractProject abstractProject;
    private transient final List<State> newAndOpen = list(State.NEW, State.OPEN);

    public CodehealthProjectAction(AbstractProject abstractProject, IssueRepository issueRepository, LinesOfCodeRepository locRepository) {
        super((TopLevelItem) abstractProject, issueRepository, locRepository);
        this.abstractProject = abstractProject;
    }

    @Exported
    public Collection<IssueEntity> getIssues() {
        final ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(getClass().getClassLoader());
        try {
            return getIssueRepository().loadIssues(getTopLevelItem(), newAndOpen);
        } finally {
            Thread.currentThread().setContextClassLoader(contextClassLoader);
        }
    }

    @Exported
    public LinesOfCodeEntity getLinesOfCode() {
        if (this.abstractProject.getLastBuild() != null) {
            return getLocRepository().read(this.getTopLevelItem(), this.abstractProject.getLastBuild().getNumber());
        } else {
            return null;
        }
    }


}
