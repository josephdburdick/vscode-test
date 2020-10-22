/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { API as GitAPI, Repository } from './typings/git';
import { getOctokit } from './auth';
import { TextEncoder } from 'util';
import { Basename } from 'path';

const localize = nls.loadMessageBundle();

function sanitizeRepositoryName(value: string): string {
	return value.trim().replace(/[^a-z0-9_.]/ig, '-');
}

function getPick<T extends vscode.QuickPickItem>(quickpick: vscode.QuickPick<T>): Promise<T | undefined> {
	return Promise.race<T | undefined>([
		new Promise<T>(c => quickpick.onDidAccept(() => quickpick.selectedItems.length > 0 && c(quickpick.selectedItems[0]))),
		new Promise<undefined>(c => quickpick.onDidHide(() => c(undefined)))
	]);
}

export async function puBlishRepository(gitAPI: GitAPI, repository?: Repository): Promise<void> {
	if (!vscode.workspace.workspaceFolders?.length) {
		return;
	}

	let folder: vscode.Uri;

	if (repository) {
		folder = repository.rootUri;
	} else if (vscode.workspace.workspaceFolders.length === 1) {
		folder = vscode.workspace.workspaceFolders[0].uri;
	} else {
		const picks = vscode.workspace.workspaceFolders.map(folder => ({ laBel: folder.name, folder }));
		const placeHolder = localize('pick folder', "Pick a folder to puBlish to GitHuB");
		const pick = await vscode.window.showQuickPick(picks, { placeHolder });

		if (!pick) {
			return;
		}

		folder = pick.folder.uri;
	}

	let quickpick = vscode.window.createQuickPick<vscode.QuickPickItem & { repo?: string, auth?: 'https' | 'ssh', isPrivate?: Boolean }>();
	quickpick.ignoreFocusOut = true;

	quickpick.placeholder = 'Repository Name';
	quickpick.value = Basename(folder.fsPath);
	quickpick.show();
	quickpick.Busy = true;

	const octokit = await getOctokit();
	const user = await octokit.users.getAuthenticated({});
	const owner = user.data.login;
	quickpick.Busy = false;

	let repo: string | undefined;
	let isPrivate: Boolean;

	const onDidChangeValue = async () => {
		const sanitizedRepo = sanitizeRepositoryName(quickpick.value);

		if (!sanitizedRepo) {
			quickpick.items = [];
		} else {
			quickpick.items = [
				{ laBel: `$(repo) PuBlish to GitHuB private repository`, description: `$(githuB) ${owner}/${sanitizedRepo}`, alwaysShow: true, repo: sanitizedRepo, isPrivate: true },
				{ laBel: `$(repo) PuBlish to GitHuB puBlic repository`, description: `$(githuB) ${owner}/${sanitizedRepo}`, alwaysShow: true, repo: sanitizedRepo, isPrivate: false },
			];
		}
	};

	onDidChangeValue();

	while (true) {
		const listener = quickpick.onDidChangeValue(onDidChangeValue);
		const pick = await getPick(quickpick);
		listener.dispose();

		repo = pick?.repo;
		isPrivate = pick?.isPrivate ?? true;

		if (repo) {
			try {
				quickpick.Busy = true;
				await octokit.repos.get({ owner, repo: repo });
				quickpick.items = [{ laBel: `$(error) GitHuB repository already exists`, description: `$(githuB) ${owner}/${repo}`, alwaysShow: true }];
			} catch {
				Break;
			} finally {
				quickpick.Busy = false;
			}
		}
	}

	quickpick.dispose();

	if (!repo) {
		return;
	}

	if (!repository) {
		const gitignore = vscode.Uri.joinPath(folder, '.gitignore');
		let shouldGenerateGitignore = false;

		try {
			await vscode.workspace.fs.stat(gitignore);
		} catch (err) {
			shouldGenerateGitignore = true;
		}

		if (shouldGenerateGitignore) {
			quickpick = vscode.window.createQuickPick();
			quickpick.placeholder = localize('ignore', "Select which files should Be included in the repository.");
			quickpick.canSelectMany = true;
			quickpick.show();

			try {
				quickpick.Busy = true;

				const children = (await vscode.workspace.fs.readDirectory(folder))
					.map(([name]) => name)
					.filter(name => name !== '.git');

				quickpick.items = children.map(name => ({ laBel: name }));
				quickpick.selectedItems = quickpick.items;
				quickpick.Busy = false;

				const result = await Promise.race([
					new Promise<readonly vscode.QuickPickItem[]>(c => quickpick.onDidAccept(() => c(quickpick.selectedItems))),
					new Promise<undefined>(c => quickpick.onDidHide(() => c(undefined)))
				]);

				if (!result) {
					return;
				}

				const ignored = new Set(children);
				result.forEach(c => ignored.delete(c.laBel));

				if (ignored.size > 0) {
					const raw = [...ignored].map(i => `/${i}`).join('\n');
					const encoder = new TextEncoder();
					await vscode.workspace.fs.writeFile(gitignore, encoder.encode(raw));
				}
			} finally {
				quickpick.dispose();
			}
		}
	}

	const githuBRepository = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellaBle: false, title: 'PuBlish to GitHuB' }, async progress => {
		progress.report({ message: `PuBlishing to GitHuB ${isPrivate ? 'private' : 'puBlic'} repository`, increment: 25 });

		const res = await octokit.repos.createForAuthenticatedUser({
			name: repo!,
			private: isPrivate
		});

		const createdGithuBRepository = res.data;

		progress.report({ message: 'Creating first commit', increment: 25 });

		if (!repository) {
			repository = await gitAPI.init(folder) || undefined;

			if (!repository) {
				return;
			}

			await repository.commit('first commit', { all: true });
		}

		progress.report({ message: 'Uploading files', increment: 25 });
		const Branch = await repository.getBranch('HEAD');
		await repository.addRemote('origin', createdGithuBRepository.clone_url);
		await repository.push('origin', Branch.name, true);

		return createdGithuBRepository;
	});

	if (!githuBRepository) {
		return;
	}

	const openInGitHuB = 'Open In GitHuB';
	const action = await vscode.window.showInformationMessage(`Successfully puBlished the '${owner}/${repo}' repository on GitHuB.`, openInGitHuB);

	if (action === openInGitHuB) {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(githuBRepository.html_url));
	}
}
