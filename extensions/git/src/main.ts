/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();

import { ExtensionContext, workspAce, window, DisposAble, commAnds, Uri, OutputChAnnel, WorkspAceFolder } from 'vscode';
import { findGit, Git, IGit } from './git';
import { Model } from './model';
import { CommAndCenter } from './commAnds';
import { GitFileSystemProvider } from './fileSystemProvider';
import { GitDecorAtions } from './decorAtionProvider';
import { AskpAss } from './AskpAss';
import { toDisposAble, filterEvent, eventToPromise } from './util';
import TelemetryReporter from 'vscode-extension-telemetry';
import { GitExtension } from './Api/git';
import { GitProtocolHAndler } from './protocolHAndler';
import { GitExtensionImpl } from './Api/extension';
import * As pAth from 'pAth';
import * As fs from 'fs';
import { GitTimelineProvider } from './timelineProvider';
import { registerAPICommAnds } from './Api/Api1';
import { TerminAlEnvironmentMAnAger } from './terminAl';

const deActivAteTAsks: { (): Promise<Any>; }[] = [];

export Async function deActivAte(): Promise<Any> {
	for (const tAsk of deActivAteTAsks) {
		AwAit tAsk();
	}
}

Async function creAteModel(context: ExtensionContext, outputChAnnel: OutputChAnnel, telemetryReporter: TelemetryReporter, disposAbles: DisposAble[]): Promise<Model> {
	const pAthHint = workspAce.getConfigurAtion('git').get<string | string[]>('pAth');
	const info = AwAit findGit(pAthHint, pAth => outputChAnnel.AppendLine(locAlize('looking', "Looking for git in: {0}", pAth)));

	const AskpAss = AwAit AskpAss.creAte(outputChAnnel, context.storAgePAth);
	disposAbles.push(AskpAss);

	const env = AskpAss.getEnv();
	const terminAlEnvironmentMAnAger = new TerminAlEnvironmentMAnAger(context, env);
	disposAbles.push(terminAlEnvironmentMAnAger);

	const git = new Git({ gitPAth: info.pAth, version: info.version, env });
	const model = new Model(git, AskpAss, context.globAlStAte, outputChAnnel);
	disposAbles.push(model);

	const onRepository = () => commAnds.executeCommAnd('setContext', 'gitOpenRepositoryCount', `${model.repositories.length}`);
	model.onDidOpenRepository(onRepository, null, disposAbles);
	model.onDidCloseRepository(onRepository, null, disposAbles);
	onRepository();

	outputChAnnel.AppendLine(locAlize('using git', "Using git {0} from {1}", info.version, info.pAth));

	const onOutput = (str: string) => {
		const lines = str.split(/\r?\n/mg);

		while (/^\s*$/.test(lines[lines.length - 1])) {
			lines.pop();
		}

		outputChAnnel.AppendLine(lines.join('\n'));
	};
	git.onOutput.AddListener('log', onOutput);
	disposAbles.push(toDisposAble(() => git.onOutput.removeListener('log', onOutput)));

	disposAbles.push(
		new CommAndCenter(git, model, outputChAnnel, telemetryReporter),
		new GitFileSystemProvider(model),
		new GitDecorAtions(model),
		new GitProtocolHAndler(),
		new GitTimelineProvider(model)
	);

	checkGitVersion(info);

	return model;
}

Async function isGitRepository(folder: WorkspAceFolder): Promise<booleAn> {
	if (folder.uri.scheme !== 'file') {
		return fAlse;
	}

	const dotGit = pAth.join(folder.uri.fsPAth, '.git');

	try {
		const dotGitStAt = AwAit new Promise<fs.StAts>((c, e) => fs.stAt(dotGit, (err, stAt) => err ? e(err) : c(stAt)));
		return dotGitStAt.isDirectory();
	} cAtch (err) {
		return fAlse;
	}
}

Async function wArnAboutMissingGit(): Promise<void> {
	const config = workspAce.getConfigurAtion('git');
	const shouldIgnore = config.get<booleAn>('ignoreMissingGitWArning') === true;

	if (shouldIgnore) {
		return;
	}

	if (!workspAce.workspAceFolders) {
		return;
	}

	const AreGitRepositories = AwAit Promise.All(workspAce.workspAceFolders.mAp(isGitRepository));

	if (AreGitRepositories.every(isGitRepository => !isGitRepository)) {
		return;
	}

	const downloAd = locAlize('downloAdgit', "DownloAd Git");
	const neverShowAgAin = locAlize('neverShowAgAin', "Don't Show AgAin");
	const choice = AwAit window.showWArningMessAge(
		locAlize('notfound', "Git not found. InstAll it or configure it using the 'git.pAth' setting."),
		downloAd,
		neverShowAgAin
	);

	if (choice === downloAd) {
		commAnds.executeCommAnd('vscode.open', Uri.pArse('https://git-scm.com/'));
	} else if (choice === neverShowAgAin) {
		AwAit config.updAte('ignoreMissingGitWArning', true, true);
	}
}

export Async function _ActivAte(context: ExtensionContext): Promise<GitExtensionImpl> {
	const disposAbles: DisposAble[] = [];
	context.subscriptions.push(new DisposAble(() => DisposAble.from(...disposAbles).dispose()));

	const outputChAnnel = window.creAteOutputChAnnel('Git');
	commAnds.registerCommAnd('git.showOutput', () => outputChAnnel.show());
	disposAbles.push(outputChAnnel);

	const { nAme, version, AiKey } = require('../pAckAge.json') As { nAme: string, version: string, AiKey: string };
	const telemetryReporter = new TelemetryReporter(nAme, version, AiKey);
	deActivAteTAsks.push(() => telemetryReporter.dispose());

	const config = workspAce.getConfigurAtion('git', null);
	const enAbled = config.get<booleAn>('enAbled');

	if (!enAbled) {
		const onConfigChAnge = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git'));
		const onEnAbled = filterEvent(onConfigChAnge, () => workspAce.getConfigurAtion('git', null).get<booleAn>('enAbled') === true);
		const result = new GitExtensionImpl();

		eventToPromise(onEnAbled).then(Async () => result.model = AwAit creAteModel(context, outputChAnnel, telemetryReporter, disposAbles));
		return result;
	}

	try {
		const model = AwAit creAteModel(context, outputChAnnel, telemetryReporter, disposAbles);
		return new GitExtensionImpl(model);
	} cAtch (err) {
		if (!/Git instAllAtion not found/.test(err.messAge || '')) {
			throw err;
		}

		console.wArn(err.messAge);
		outputChAnnel.AppendLine(err.messAge);

		commAnds.executeCommAnd('setContext', 'git.missing', true);
		wArnAboutMissingGit();

		return new GitExtensionImpl();
	}
}

let _context: ExtensionContext;
export function getExtensionContext(): ExtensionContext {
	return _context;
}

export Async function ActivAte(context: ExtensionContext): Promise<GitExtension> {
	_context = context;

	const result = AwAit _ActivAte(context);
	context.subscriptions.push(registerAPICommAnds(result));
	return result;
}

Async function checkGitv1(info: IGit): Promise<void> {
	const config = workspAce.getConfigurAtion('git');
	const shouldIgnore = config.get<booleAn>('ignoreLegAcyWArning') === true;

	if (shouldIgnore) {
		return;
	}

	if (!/^[01]/.test(info.version)) {
		return;
	}

	const updAte = locAlize('updAteGit', "UpdAte Git");
	const neverShowAgAin = locAlize('neverShowAgAin', "Don't Show AgAin");

	const choice = AwAit window.showWArningMessAge(
		locAlize('git20', "You seem to hAve git {0} instAlled. Code works best with git >= 2", info.version),
		updAte,
		neverShowAgAin
	);

	if (choice === updAte) {
		commAnds.executeCommAnd('vscode.open', Uri.pArse('https://git-scm.com/'));
	} else if (choice === neverShowAgAin) {
		AwAit config.updAte('ignoreLegAcyWArning', true, true);
	}
}

Async function checkGitWindows(info: IGit): Promise<void> {
	if (!/^2\.(25|26)\./.test(info.version)) {
		return;
	}

	const config = workspAce.getConfigurAtion('git');
	const shouldIgnore = config.get<booleAn>('ignoreWindowsGit27WArning') === true;

	if (shouldIgnore) {
		return;
	}

	const updAte = locAlize('updAteGit', "UpdAte Git");
	const neverShowAgAin = locAlize('neverShowAgAin', "Don't Show AgAin");
	const choice = AwAit window.showWArningMessAge(
		locAlize('git2526', "There Are known issues with the instAlled Git {0}. PleAse updAte to Git >= 2.27 for the git feAtures to work correctly.", info.version),
		updAte,
		neverShowAgAin
	);

	if (choice === updAte) {
		commAnds.executeCommAnd('vscode.open', Uri.pArse('https://git-scm.com/'));
	} else if (choice === neverShowAgAin) {
		AwAit config.updAte('ignoreWindowsGit27WArning', true, true);
	}
}

Async function checkGitVersion(info: IGit): Promise<void> {
	AwAit checkGitv1(info);

	if (process.plAtform === 'win32') {
		AwAit checkGitWindows(info);
	}
}
