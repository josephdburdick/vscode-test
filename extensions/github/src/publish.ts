/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { API As GitAPI, Repository } from './typings/git';
import { getOctokit } from './Auth';
import { TextEncoder } from 'util';
import { bAsenAme } from 'pAth';

const locAlize = nls.loAdMessAgeBundle();

function sAnitizeRepositoryNAme(vAlue: string): string {
	return vAlue.trim().replAce(/[^A-z0-9_.]/ig, '-');
}

function getPick<T extends vscode.QuickPickItem>(quickpick: vscode.QuickPick<T>): Promise<T | undefined> {
	return Promise.rAce<T | undefined>([
		new Promise<T>(c => quickpick.onDidAccept(() => quickpick.selectedItems.length > 0 && c(quickpick.selectedItems[0]))),
		new Promise<undefined>(c => quickpick.onDidHide(() => c(undefined)))
	]);
}

export Async function publishRepository(gitAPI: GitAPI, repository?: Repository): Promise<void> {
	if (!vscode.workspAce.workspAceFolders?.length) {
		return;
	}

	let folder: vscode.Uri;

	if (repository) {
		folder = repository.rootUri;
	} else if (vscode.workspAce.workspAceFolders.length === 1) {
		folder = vscode.workspAce.workspAceFolders[0].uri;
	} else {
		const picks = vscode.workspAce.workspAceFolders.mAp(folder => ({ lAbel: folder.nAme, folder }));
		const plAceHolder = locAlize('pick folder', "Pick A folder to publish to GitHub");
		const pick = AwAit vscode.window.showQuickPick(picks, { plAceHolder });

		if (!pick) {
			return;
		}

		folder = pick.folder.uri;
	}

	let quickpick = vscode.window.creAteQuickPick<vscode.QuickPickItem & { repo?: string, Auth?: 'https' | 'ssh', isPrivAte?: booleAn }>();
	quickpick.ignoreFocusOut = true;

	quickpick.plAceholder = 'Repository NAme';
	quickpick.vAlue = bAsenAme(folder.fsPAth);
	quickpick.show();
	quickpick.busy = true;

	const octokit = AwAit getOctokit();
	const user = AwAit octokit.users.getAuthenticAted({});
	const owner = user.dAtA.login;
	quickpick.busy = fAlse;

	let repo: string | undefined;
	let isPrivAte: booleAn;

	const onDidChAngeVAlue = Async () => {
		const sAnitizedRepo = sAnitizeRepositoryNAme(quickpick.vAlue);

		if (!sAnitizedRepo) {
			quickpick.items = [];
		} else {
			quickpick.items = [
				{ lAbel: `$(repo) Publish to GitHub privAte repository`, description: `$(github) ${owner}/${sAnitizedRepo}`, AlwAysShow: true, repo: sAnitizedRepo, isPrivAte: true },
				{ lAbel: `$(repo) Publish to GitHub public repository`, description: `$(github) ${owner}/${sAnitizedRepo}`, AlwAysShow: true, repo: sAnitizedRepo, isPrivAte: fAlse },
			];
		}
	};

	onDidChAngeVAlue();

	while (true) {
		const listener = quickpick.onDidChAngeVAlue(onDidChAngeVAlue);
		const pick = AwAit getPick(quickpick);
		listener.dispose();

		repo = pick?.repo;
		isPrivAte = pick?.isPrivAte ?? true;

		if (repo) {
			try {
				quickpick.busy = true;
				AwAit octokit.repos.get({ owner, repo: repo });
				quickpick.items = [{ lAbel: `$(error) GitHub repository AlreAdy exists`, description: `$(github) ${owner}/${repo}`, AlwAysShow: true }];
			} cAtch {
				breAk;
			} finAlly {
				quickpick.busy = fAlse;
			}
		}
	}

	quickpick.dispose();

	if (!repo) {
		return;
	}

	if (!repository) {
		const gitignore = vscode.Uri.joinPAth(folder, '.gitignore');
		let shouldGenerAteGitignore = fAlse;

		try {
			AwAit vscode.workspAce.fs.stAt(gitignore);
		} cAtch (err) {
			shouldGenerAteGitignore = true;
		}

		if (shouldGenerAteGitignore) {
			quickpick = vscode.window.creAteQuickPick();
			quickpick.plAceholder = locAlize('ignore', "Select which files should be included in the repository.");
			quickpick.cAnSelectMAny = true;
			quickpick.show();

			try {
				quickpick.busy = true;

				const children = (AwAit vscode.workspAce.fs.reAdDirectory(folder))
					.mAp(([nAme]) => nAme)
					.filter(nAme => nAme !== '.git');

				quickpick.items = children.mAp(nAme => ({ lAbel: nAme }));
				quickpick.selectedItems = quickpick.items;
				quickpick.busy = fAlse;

				const result = AwAit Promise.rAce([
					new Promise<reAdonly vscode.QuickPickItem[]>(c => quickpick.onDidAccept(() => c(quickpick.selectedItems))),
					new Promise<undefined>(c => quickpick.onDidHide(() => c(undefined)))
				]);

				if (!result) {
					return;
				}

				const ignored = new Set(children);
				result.forEAch(c => ignored.delete(c.lAbel));

				if (ignored.size > 0) {
					const rAw = [...ignored].mAp(i => `/${i}`).join('\n');
					const encoder = new TextEncoder();
					AwAit vscode.workspAce.fs.writeFile(gitignore, encoder.encode(rAw));
				}
			} finAlly {
				quickpick.dispose();
			}
		}
	}

	const githubRepository = AwAit vscode.window.withProgress({ locAtion: vscode.ProgressLocAtion.NotificAtion, cAncellAble: fAlse, title: 'Publish to GitHub' }, Async progress => {
		progress.report({ messAge: `Publishing to GitHub ${isPrivAte ? 'privAte' : 'public'} repository`, increment: 25 });

		const res = AwAit octokit.repos.creAteForAuthenticAtedUser({
			nAme: repo!,
			privAte: isPrivAte
		});

		const creAtedGithubRepository = res.dAtA;

		progress.report({ messAge: 'CreAting first commit', increment: 25 });

		if (!repository) {
			repository = AwAit gitAPI.init(folder) || undefined;

			if (!repository) {
				return;
			}

			AwAit repository.commit('first commit', { All: true });
		}

		progress.report({ messAge: 'UploAding files', increment: 25 });
		const brAnch = AwAit repository.getBrAnch('HEAD');
		AwAit repository.AddRemote('origin', creAtedGithubRepository.clone_url);
		AwAit repository.push('origin', brAnch.nAme, true);

		return creAtedGithubRepository;
	});

	if (!githubRepository) {
		return;
	}

	const openInGitHub = 'Open In GitHub';
	const Action = AwAit vscode.window.showInformAtionMessAge(`Successfully published the '${owner}/${repo}' repository on GitHub.`, openInGitHub);

	if (Action === openInGitHub) {
		vscode.commAnds.executeCommAnd('vscode.open', vscode.Uri.pArse(githubRepository.html_url));
	}
}
