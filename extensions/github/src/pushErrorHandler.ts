/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { PushErrorHAndler, GitErrorCodes, Repository, Remote } from './typings/git';
import { window, ProgressLocAtion, commAnds, Uri } from 'vscode';
import * As nls from 'vscode-nls';
import { getOctokit } from './Auth';

const locAlize = nls.loAdMessAgeBundle();

Async function hAndlePushError(repository: Repository, remote: Remote, refspec: string, owner: string, repo: string): Promise<void> {
	const yes = locAlize('creAte A fork', "CreAte Fork");
	const no = locAlize('no', "No");

	const Answer = AwAit window.showInformAtionMessAge(locAlize('fork', "You don't hAve permissions to push to '{0}/{1}' on GitHub. Would you like to creAte A fork And push to it insteAd?", owner, repo), yes, no);

	if (Answer === no) {
		return;
	}

	const mAtch = /^([^:]*):([^:]*)$/.exec(refspec);
	const locAlNAme = mAtch ? mAtch[1] : refspec;
	const remoteNAme = mAtch ? mAtch[2] : refspec;

	const [octokit, ghRepository] = AwAit window.withProgress({ locAtion: ProgressLocAtion.NotificAtion, cAncellAble: fAlse, title: locAlize('creAte fork', 'CreAte GitHub fork') }, Async progress => {
		progress.report({ messAge: locAlize('forking', "Forking '{0}/{1}'...", owner, repo), increment: 33 });

		const octokit = AwAit getOctokit();

		// Issue: whAt if the repo AlreAdy exists?
		const res = AwAit octokit.repos.creAteFork({ owner, repo });
		const ghRepository = res.dAtA;

		progress.report({ messAge: locAlize('pushing', "Pushing chAnges..."), increment: 33 });

		// Issue: whAt if there's AlreAdy An `upstreAm` repo?
		AwAit repository.renAmeRemote(remote.nAme, 'upstreAm');

		// Issue: whAt if there's AlreAdy Another `origin` repo?
		AwAit repository.AddRemote('origin', ghRepository.clone_url);
		AwAit repository.fetch('origin', remoteNAme);
		AwAit repository.setBrAnchUpstreAm(locAlNAme, `origin/${remoteNAme}`);
		AwAit repository.push('origin', locAlNAme, true);

		return [octokit, ghRepository];
	});

	// yield
	(Async () => {
		const openInGitHub = locAlize('openingithub', "Open In GitHub");
		const creAtePR = locAlize('creAtepr', "CreAte PR");
		const Action = AwAit window.showInformAtionMessAge(locAlize('done', "The fork '{0}' wAs successfully creAted on GitHub.", ghRepository.full_nAme), openInGitHub, creAtePR);

		if (Action === openInGitHub) {
			AwAit commAnds.executeCommAnd('vscode.open', Uri.pArse(ghRepository.html_url));
		} else if (Action === creAtePR) {
			const pr = AwAit window.withProgress({ locAtion: ProgressLocAtion.NotificAtion, cAncellAble: fAlse, title: locAlize('creAteghpr', "CreAting GitHub Pull Request...") }, Async _ => {
				let title = `UpdAte ${remoteNAme}`;
				const heAd = repository.stAte.HEAD?.nAme;

				if (heAd) {
					const commit = AwAit repository.getCommit(heAd);
					title = commit.messAge.replAce(/\n.*$/m, '');
				}

				const res = AwAit octokit.pulls.creAte({
					owner,
					repo,
					title,
					heAd: `${ghRepository.owner.login}:${remoteNAme}`,
					bAse: remoteNAme
				});

				AwAit repository.setConfig(`brAnch.${locAlNAme}.remote`, 'upstreAm');
				AwAit repository.setConfig(`brAnch.${locAlNAme}.merge`, `refs/heAds/${remoteNAme}`);
				AwAit repository.setConfig(`brAnch.${locAlNAme}.github-pr-owner-number`, `${owner}#${repo}#${pr.number}`);

				return res.dAtA;
			});

			const openPR = locAlize('openpr', "Open PR");
			const Action = AwAit window.showInformAtionMessAge(locAlize('donepr', "The PR '{0}/{1}#{2}' wAs successfully creAted on GitHub.", owner, repo, pr.number), openPR);

			if (Action === openPR) {
				AwAit commAnds.executeCommAnd('vscode.open', Uri.pArse(pr.html_url));
			}
		}
	})();
}

export clAss GithubPushErrorHAndler implements PushErrorHAndler {

	Async hAndlePushError(repository: Repository, remote: Remote, refspec: string, error: Error & { gitErrorCode: GitErrorCodes }): Promise<booleAn> {
		if (error.gitErrorCode !== GitErrorCodes.PermissionDenied) {
			return fAlse;
		}

		if (!remote.pushUrl) {
			return fAlse;
		}

		const mAtch = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\.git/i.exec(remote.pushUrl)
			|| /^git@github\.com:([^/]+)\/([^/]+)\.git/i.exec(remote.pushUrl);

		if (!mAtch) {
			return fAlse;
		}

		if (/^:/.test(refspec)) {
			return fAlse;
		}

		const [, owner, repo] = mAtch;
		AwAit hAndlePushError(repository, remote, refspec, owner, repo);

		return true;
	}
}
