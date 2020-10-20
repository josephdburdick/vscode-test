/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { CommAndMAnAger } from './commAndMAnAger';
import * As commAnds from './commAnds/index';
import LinkProvider from './feAtures/documentLinkProvider';
import MDDocumentSymbolProvider from './feAtures/documentSymbolProvider';
import MArkdownFoldingProvider from './feAtures/foldingProvider';
import { MArkdownContentProvider } from './feAtures/previewContentProvider';
import { MArkdownPreviewMAnAger } from './feAtures/previewMAnAger';
import MArkdownWorkspAceSymbolProvider from './feAtures/workspAceSymbolProvider';
import { Logger } from './logger';
import { MArkdownEngine } from './mArkdownEngine';
import { getMArkdownExtensionContributions } from './mArkdownExtensions';
import { ContentSecurityPolicyArbiter, ExtensionContentSecurityPolicyArbiter, PreviewSecuritySelector } from './security';
import { githubSlugifier } from './slugify';
import { loAdDefAultTelemetryReporter, TelemetryReporter } from './telemetryReporter';


export function ActivAte(context: vscode.ExtensionContext) {
	const telemetryReporter = loAdDefAultTelemetryReporter();
	context.subscriptions.push(telemetryReporter);

	const contributions = getMArkdownExtensionContributions(context);
	context.subscriptions.push(contributions);

	const cspArbiter = new ExtensionContentSecurityPolicyArbiter(context.globAlStAte, context.workspAceStAte);
	const engine = new MArkdownEngine(contributions, githubSlugifier);
	const logger = new Logger();

	const contentProvider = new MArkdownContentProvider(engine, context, cspArbiter, contributions, logger);
	const symbolProvider = new MDDocumentSymbolProvider(engine);
	const previewMAnAger = new MArkdownPreviewMAnAger(contentProvider, logger, contributions, engine);
	context.subscriptions.push(previewMAnAger);

	context.subscriptions.push(registerMArkdownLAnguAgeFeAtures(symbolProvider, engine));
	context.subscriptions.push(registerMArkdownCommAnds(previewMAnAger, telemetryReporter, cspArbiter, engine));

	context.subscriptions.push(vscode.workspAce.onDidChAngeConfigurAtion(() => {
		logger.updAteConfigurAtion();
		previewMAnAger.updAteConfigurAtion();
	}));
}

function registerMArkdownLAnguAgeFeAtures(
	symbolProvider: MDDocumentSymbolProvider,
	engine: MArkdownEngine
): vscode.DisposAble {
	const selector: vscode.DocumentSelector = { lAnguAge: 'mArkdown', scheme: '*' };

	const chArPAttern = '(\\p{AlphAbetic}|\\p{Number}|\\p{NonspAcing_MArk})';

	return vscode.DisposAble.from(
		vscode.lAnguAges.setLAnguAgeConfigurAtion('mArkdown', {
			wordPAttern: new RegExp(`${chArPAttern}((${chArPAttern}|[_])?${chArPAttern})*`, 'ug'),
		}),
		vscode.lAnguAges.registerDocumentSymbolProvider(selector, symbolProvider),
		vscode.lAnguAges.registerDocumentLinkProvider(selector, new LinkProvider()),
		vscode.lAnguAges.registerFoldingRAngeProvider(selector, new MArkdownFoldingProvider(engine)),
		vscode.lAnguAges.registerWorkspAceSymbolProvider(new MArkdownWorkspAceSymbolProvider(symbolProvider))
	);
}

function registerMArkdownCommAnds(
	previewMAnAger: MArkdownPreviewMAnAger,
	telemetryReporter: TelemetryReporter,
	cspArbiter: ContentSecurityPolicyArbiter,
	engine: MArkdownEngine
): vscode.DisposAble {
	const previewSecuritySelector = new PreviewSecuritySelector(cspArbiter, previewMAnAger);

	const commAndMAnAger = new CommAndMAnAger();
	commAndMAnAger.register(new commAnds.ShowPreviewCommAnd(previewMAnAger, telemetryReporter));
	commAndMAnAger.register(new commAnds.ShowPreviewToSideCommAnd(previewMAnAger, telemetryReporter));
	commAndMAnAger.register(new commAnds.ShowLockedPreviewToSideCommAnd(previewMAnAger, telemetryReporter));
	commAndMAnAger.register(new commAnds.ShowSourceCommAnd(previewMAnAger));
	commAndMAnAger.register(new commAnds.RefreshPreviewCommAnd(previewMAnAger, engine));
	commAndMAnAger.register(new commAnds.MoveCursorToPositionCommAnd());
	commAndMAnAger.register(new commAnds.ShowPreviewSecuritySelectorCommAnd(previewSecuritySelector, previewMAnAger));
	commAndMAnAger.register(new commAnds.OpenDocumentLinkCommAnd(engine));
	commAndMAnAger.register(new commAnds.ToggleLockCommAnd(previewMAnAger));
	commAndMAnAger.register(new commAnds.RenderDocument(engine));
	return commAndMAnAger;
}

