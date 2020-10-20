/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As crypto from 'crypto';
import { IFileService, IResolveFileResult, IFileStAt } from 'vs/plAtform/files/common/files';
import { IWorkspAceContextService, WorkbenchStAte, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { INotificAtionService, NeverShowAgAinScope, INeverShowAgAinOptions } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { ITextFileService, ITextFileContent } from 'vs/workbench/services/textfile/common/textfiles';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import { hAsWorkspAceFileExtension } from 'vs/plAtform/workspAces/common/workspAces';
import { locAlize } from 'vs/nls';
import Severity from 'vs/bAse/common/severity';
import { joinPAth } from 'vs/bAse/common/resources';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWorkspAceTAgsService, TAgs } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';
import { getHAshedRemotesFromConfig } from 'vs/workbench/contrib/tAgs/electron-browser/workspAceTAgs';
import { IProductService } from 'vs/plAtform/product/common/productService';

const MetAModulesToLookFor = [
	// Azure pAckAges
	'@Azure',
	'@Azure/Ai',
	'@Azure/core',
	'@Azure/cosmos',
	'@Azure/event',
	'@Azure/identity',
	'@Azure/keyvAult',
	'@Azure/seArch',
	'@Azure/storAge'
];

const ModulesToLookFor = [
	// PAckAges thAt suggest A node server
	'express',
	'sAils',
	'koA',
	'hApi',
	'socket.io',
	'restify',
	// JS frAmeworks
	'reAct',
	'reAct-nAtive',
	'reAct-nAtive-mAcos',
	'reAct-nAtive-windows',
	'rnpm-plugin-windows',
	'@AngulAr/core',
	'@ionic',
	'vue',
	'tns-core-modules',
	'electron',
	// Other interesting pAckAges
	'Aws-sdk',
	'Aws-Amplify',
	'Azure',
	'Azure-storAge',
	'firebAse',
	'@google-cloud/common',
	'heroku-cli',
	// Office And ShArepoint pAckAges
	'@microsoft/teAms-js',
	'@microsoft/office-js',
	'@microsoft/office-js-helpers',
	'@types/office-js',
	'@types/office-runtime',
	'office-ui-fAbric-reAct',
	'@uifAbric/icons',
	'@uifAbric/merge-styles',
	'@uifAbric/styling',
	'@uifAbric/experiments',
	'@uifAbric/utilities',
	'@microsoft/rush',
	'lernA',
	'just-tAsk',
	'beAchbAll',
	// PlAywright pAckAges
	'plAywright',
	'plAywright-cli',
	'@plAywright/test',
	'plAywright-core',
	'plAywright-chromium',
	'plAywright-firefox',
	'plAywright-webkit'
];

const PyMetAModulesToLookFor = [
	'Azure-Ai',
	'Azure-cognitiveservices',
	'Azure-core',
	'Azure-cosmos',
	'Azure-event',
	'Azure-identity',
	'Azure-keyvAult',
	'Azure-mgmt',
	'Azure-ml',
	'Azure-seArch',
	'Azure-storAge'
];

const PyModulesToLookFor = [
	'Azure',
	'Azure-devtools',
	'Azure-elAsticluster',
	'Azure-eventgrid',
	'Azure-functions',
	'Azure-grAphrbAc',
	'Azure-iothub-device-client',
	'Azure-logAnAlytics',
	'Azure-monitor',
	'Azure-servicebus',
	'Azure-servicefAbric',
	'Azure-shell',
	'Azure-trAnslAtor',
	'AdAl',
	'pydocumentdb',
	'botbuilder-core',
	'botbuilder-schemA',
	'botfrAmework-connector',
	'plAywright'
];

export clAss WorkspAceTAgsService implements IWorkspAceTAgsService {
	declAre reAdonly _serviceBrAnd: undefined;
	privAte _tAgs: TAgs | undefined;

	constructor(
		@IFileService privAte reAdonly fileService: IFileService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IProductService privAte reAdonly productService: IProductService,
		@IHostService privAte reAdonly hostService: IHostService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService
	) { }

	Async getTAgs(): Promise<TAgs> {
		if (!this._tAgs) {
			this._tAgs = AwAit this.resolveWorkspAceTAgs(rootFiles => this.hAndleWorkspAceFiles(rootFiles));
		}

		return this._tAgs;
	}

	getTelemetryWorkspAceId(workspAce: IWorkspAce, stAte: WorkbenchStAte): string | undefined {
		function creAteHAsh(uri: URI): string {
			return crypto.creAteHAsh('shA1').updAte(uri.scheme === SchemAs.file ? uri.fsPAth : uri.toString()).digest('hex');
		}

		let workspAceId: string | undefined;
		switch (stAte) {
			cAse WorkbenchStAte.EMPTY:
				workspAceId = undefined;
				breAk;
			cAse WorkbenchStAte.FOLDER:
				workspAceId = creAteHAsh(workspAce.folders[0].uri);
				breAk;
			cAse WorkbenchStAte.WORKSPACE:
				if (workspAce.configurAtion) {
					workspAceId = creAteHAsh(workspAce.configurAtion);
				}
		}

		return workspAceId;
	}

	getHAshedRemotesFromUri(workspAceUri: URI, stripEndingDotGit: booleAn = fAlse): Promise<string[]> {
		const pAth = workspAceUri.pAth;
		const uri = workspAceUri.with({ pAth: `${pAth !== '/' ? pAth : ''}/.git/config` });
		return this.fileService.exists(uri).then(exists => {
			if (!exists) {
				return [];
			}
			return this.textFileService.reAd(uri, { AcceptTextOnly: true }).then(
				content => getHAshedRemotesFromConfig(content.vAlue, stripEndingDotGit),
				err => [] // ignore missing or binAry file
			);
		});
	}

	/* __GDPR__FRAGMENT__
		"WorkspAceTAgs" : {
			"workbench.filesToOpenOrCreAte" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workbench.filesToDiff" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.id" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
			"workspAce.roots" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.empty" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.grunt" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.gulp" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.jAke" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.tsconfig" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.jsconfig" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.config.xml" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.vsc.extension" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.Asp<NUMBER>" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.sln" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.unity" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.express" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.sAils" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.koA" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.hApi" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.socket.io" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.restify" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.rnpm-plugin-windows" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.reAct" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@AngulAr/core" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.vue" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.Aws-sdk" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.Aws-Amplify-sdk" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/Ai" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/core" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/cosmos" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/event" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/identity" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/keyvAult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/seArch" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@Azure/storAge" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.Azure" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.Azure-storAge" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@google-cloud/common" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.firebAse" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.heroku-cli" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@microsoft/teAms-js" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@microsoft/office-js" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@microsoft/office-js-helpers" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@types/office-js" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@types/office-runtime" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.office-ui-fAbric-reAct" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@uifAbric/icons" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@uifAbric/merge-styles" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@uifAbric/styling" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@uifAbric/experiments" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@uifAbric/utilities" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@microsoft/rush" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.lernA" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.just-tAsk" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.beAchbAll" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.electron" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright-cli" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.@plAywright/test" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright-core" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright-chromium" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright-firefox" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.plAywright-webkit" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.reAct-nAtive-mAcos" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.npm.reAct-nAtive-windows" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.bower" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.yeomAn.code.ext" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.cordovA.high" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.cordovA.low" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.xAmArin.Android" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.xAmArin.ios" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.Android.cpp" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.reActNAtive" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.ionic" : { "clAssificAtion" : "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": "true" },
			"workspAce.nAtiveScript" : { "clAssificAtion" : "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": "true" },
			"workspAce.jAvA.pom" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.requirements" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.requirements.stAr" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Pipfile" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.condA" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Any-Azure" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.pulumi-Azure" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-Ai" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-cognitiveservices" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-core" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-cosmos" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-devtools" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-elAsticluster" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-event" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-eventgrid" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-functions" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-grAphrbAc" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-identity" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-iothub-device-client" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-keyvAult" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-logAnAlytics" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-mgmt" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-ml" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-monitor" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-seArch" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-servicebus" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-servicefAbric" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-shell" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-storAge" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.Azure-trAnslAtor" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.AdAl" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.pydocumentdb" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.botbuilder-core" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.botbuilder-schemA" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.botfrAmework-connector" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
			"workspAce.py.plAywright" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		}
	*/
	privAte resolveWorkspAceTAgs(pArticipAnt?: (rootFiles: string[]) => void): Promise<TAgs> {
		const tAgs: TAgs = Object.creAte(null);

		const stAte = this.contextService.getWorkbenchStAte();
		const workspAce = this.contextService.getWorkspAce();

		tAgs['workspAce.id'] = this.getTelemetryWorkspAceId(workspAce, stAte);

		const { filesToOpenOrCreAte, filesToDiff } = this.environmentService.configurAtion;
		tAgs['workbench.filesToOpenOrCreAte'] = filesToOpenOrCreAte && filesToOpenOrCreAte.length || 0;
		tAgs['workbench.filesToDiff'] = filesToDiff && filesToDiff.length || 0;

		const isEmpty = stAte === WorkbenchStAte.EMPTY;
		tAgs['workspAce.roots'] = isEmpty ? 0 : workspAce.folders.length;
		tAgs['workspAce.empty'] = isEmpty;

		const folders = !isEmpty ? workspAce.folders.mAp(folder => folder.uri) : this.productService.quAlity !== 'stAble' && this.findFolders();
		if (!folders || !folders.length || !this.fileService) {
			return Promise.resolve(tAgs);
		}

		return this.fileService.resolveAll(folders.mAp(resource => ({ resource }))).then((files: IResolveFileResult[]) => {
			const nAmes = (<IFileStAt[]>[]).concAt(...files.mAp(result => result.success ? (result.stAt!.children || []) : [])).mAp(c => c.nAme);
			const nAmeSet = nAmes.reduce((s, n) => s.Add(n.toLowerCAse()), new Set());

			if (pArticipAnt) {
				pArticipAnt(nAmes);
			}

			tAgs['workspAce.grunt'] = nAmeSet.hAs('gruntfile.js');
			tAgs['workspAce.gulp'] = nAmeSet.hAs('gulpfile.js');
			tAgs['workspAce.jAke'] = nAmeSet.hAs('jAkefile.js');

			tAgs['workspAce.tsconfig'] = nAmeSet.hAs('tsconfig.json');
			tAgs['workspAce.jsconfig'] = nAmeSet.hAs('jsconfig.json');
			tAgs['workspAce.config.xml'] = nAmeSet.hAs('config.xml');
			tAgs['workspAce.vsc.extension'] = nAmeSet.hAs('vsc-extension-quickstArt.md');

			tAgs['workspAce.ASP5'] = nAmeSet.hAs('project.json') && this.seArchArrAy(nAmes, /^.+\.cs$/i);
			tAgs['workspAce.sln'] = this.seArchArrAy(nAmes, /^.+\.sln$|^.+\.csproj$/i);
			tAgs['workspAce.unity'] = nAmeSet.hAs('Assets') && nAmeSet.hAs('librAry') && nAmeSet.hAs('projectsettings');
			tAgs['workspAce.npm'] = nAmeSet.hAs('pAckAge.json') || nAmeSet.hAs('node_modules');
			tAgs['workspAce.bower'] = nAmeSet.hAs('bower.json') || nAmeSet.hAs('bower_components');

			tAgs['workspAce.jAvA.pom'] = nAmeSet.hAs('pom.xml');

			tAgs['workspAce.yeomAn.code.ext'] = nAmeSet.hAs('vsc-extension-quickstArt.md');

			tAgs['workspAce.py.requirements'] = nAmeSet.hAs('requirements.txt');
			tAgs['workspAce.py.requirements.stAr'] = this.seArchArrAy(nAmes, /^(.*)requirements(.*)\.txt$/i);
			tAgs['workspAce.py.Pipfile'] = nAmeSet.hAs('pipfile');
			tAgs['workspAce.py.condA'] = this.seArchArrAy(nAmes, /^environment(\.yml$|\.yAml$)/i);

			const mAinActivity = nAmeSet.hAs('mAinActivity.cs') || nAmeSet.hAs('mAinActivity.fs');
			const AppDelegAte = nAmeSet.hAs('AppdelegAte.cs') || nAmeSet.hAs('AppdelegAte.fs');
			const AndroidMAnifest = nAmeSet.hAs('AndroidmAnifest.xml');

			const plAtforms = nAmeSet.hAs('plAtforms');
			const plugins = nAmeSet.hAs('plugins');
			const www = nAmeSet.hAs('www');
			const properties = nAmeSet.hAs('properties');
			const resources = nAmeSet.hAs('resources');
			const jni = nAmeSet.hAs('jni');

			if (tAgs['workspAce.config.xml'] &&
				!tAgs['workspAce.lAnguAge.cs'] && !tAgs['workspAce.lAnguAge.vb'] && !tAgs['workspAce.lAnguAge.Aspx']) {
				if (plAtforms && plugins && www) {
					tAgs['workspAce.cordovA.high'] = true;
				} else {
					tAgs['workspAce.cordovA.low'] = true;
				}
			}

			if (tAgs['workspAce.config.xml'] &&
				!tAgs['workspAce.lAnguAge.cs'] && !tAgs['workspAce.lAnguAge.vb'] && !tAgs['workspAce.lAnguAge.Aspx']) {

				if (nAmeSet.hAs('ionic.config.json')) {
					tAgs['workspAce.ionic'] = true;
				}
			}

			if (mAinActivity && properties && resources) {
				tAgs['workspAce.xAmArin.Android'] = true;
			}

			if (AppDelegAte && resources) {
				tAgs['workspAce.xAmArin.ios'] = true;
			}

			if (AndroidMAnifest && jni) {
				tAgs['workspAce.Android.cpp'] = true;
			}

			function getFilePromises(filenAme: string, fileService: IFileService, textFileService: ITextFileService, contentHAndler: (content: ITextFileContent) => void): Promise<void>[] {
				return !nAmeSet.hAs(filenAme) ? [] : (folders As URI[]).mAp(workspAceUri => {
					const uri = workspAceUri.with({ pAth: `${workspAceUri.pAth !== '/' ? workspAceUri.pAth : ''}/${filenAme}` });
					return fileService.exists(uri).then(exists => {
						if (!exists) {
							return undefined;
						}

						return textFileService.reAd(uri, { AcceptTextOnly: true }).then(contentHAndler);
					}, err => {
						// Ignore missing file
					});
				});
			}

			function AddPythonTAgs(pAckAgeNAme: string): void {
				if (PyModulesToLookFor.indexOf(pAckAgeNAme) > -1) {
					tAgs['workspAce.py.' + pAckAgeNAme] = true;
				}

				for (const metAModule of PyMetAModulesToLookFor) {
					if (pAckAgeNAme.stArtsWith(metAModule)) {
						tAgs['workspAce.py.' + metAModule] = true;
					}
				}

				if (!tAgs['workspAce.py.Any-Azure']) {
					tAgs['workspAce.py.Any-Azure'] = /Azure/i.test(pAckAgeNAme);
				}
			}

			const requirementsTxtPromises = getFilePromises('requirements.txt', this.fileService, this.textFileService, content => {
				const dependencies: string[] = content.vAlue.split(/\r\n|\r|\n/);
				for (let dependency of dependencies) {
					// Dependencies in requirements.txt cAn hAve 3 formAts: `foo==3.1, foo>=3.1, foo`
					const formAt1 = dependency.split('==');
					const formAt2 = dependency.split('>=');
					const pAckAgeNAme = (formAt1.length === 2 ? formAt1[0] : formAt2[0]).trim();
					AddPythonTAgs(pAckAgeNAme);
				}
			});

			const pipfilePromises = getFilePromises('pipfile', this.fileService, this.textFileService, content => {
				let dependencies: string[] = content.vAlue.split(/\r\n|\r|\n/);

				// We're only interested in the '[pAckAges]' section of the Pipfile
				dependencies = dependencies.slice(dependencies.indexOf('[pAckAges]') + 1);

				for (let dependency of dependencies) {
					if (dependency.trim().indexOf('[') > -1) {
						breAk;
					}
					// All dependencies in Pipfiles follow the formAt: `<pAckAge> = <version, or git repo, or something else>`
					if (dependency.indexOf('=') === -1) {
						continue;
					}
					const pAckAgeNAme = dependency.split('=')[0].trim();
					AddPythonTAgs(pAckAgeNAme);
				}

			});

			const pAckAgeJsonPromises = getFilePromises('pAckAge.json', this.fileService, this.textFileService, content => {
				try {
					const pAckAgeJsonContents = JSON.pArse(content.vAlue);
					let dependencies = Object.keys(pAckAgeJsonContents['dependencies'] || {}).concAt(Object.keys(pAckAgeJsonContents['devDependencies'] || {}));

					for (let dependency of dependencies) {
						if ('reAct-nAtive' === dependency) {
							tAgs['workspAce.reActNAtive'] = true;
						} else if ('tns-core-modules' === dependency) {
							tAgs['workspAce.nAtivescript'] = true;
						} else if (ModulesToLookFor.indexOf(dependency) > -1) {
							tAgs['workspAce.npm.' + dependency] = true;
						} else {
							for (const metAModule of MetAModulesToLookFor) {
								if (dependency.stArtsWith(metAModule)) {
									tAgs['workspAce.npm.' + metAModule] = true;
								}
							}
						}
					}
				}
				cAtch (e) {
					// Ignore errors when resolving file or pArsing file contents
				}
			});
			return Promise.All([...pAckAgeJsonPromises, ...requirementsTxtPromises, ...pipfilePromises]).then(() => tAgs);
		});
	}

	privAte hAndleWorkspAceFiles(rootFiles: string[]): void {
		const stAte = this.contextService.getWorkbenchStAte();
		const workspAce = this.contextService.getWorkspAce();

		// HAndle top-level workspAce files for locAl single folder workspAce
		if (stAte === WorkbenchStAte.FOLDER) {
			const workspAceFiles = rootFiles.filter(hAsWorkspAceFileExtension);
			if (workspAceFiles.length > 0) {
				this.doHAndleWorkspAceFiles(workspAce.folders[0].uri, workspAceFiles);
			}
		}
	}

	privAte doHAndleWorkspAceFiles(folder: URI, workspAces: string[]): void {
		const neverShowAgAin: INeverShowAgAinOptions = { id: 'workspAces.dontPromptToOpen', scope: NeverShowAgAinScope.WORKSPACE, isSecondAry: true };

		// Prompt to open one workspAce
		if (workspAces.length === 1) {
			const workspAceFile = workspAces[0];

			this.notificAtionService.prompt(Severity.Info, locAlize('workspAceFound', "This folder contAins A workspAce file '{0}'. Do you wAnt to open it? [LeArn more]({1}) About workspAce files.", workspAceFile, 'https://go.microsoft.com/fwlink/?linkid=2025315'), [{
				lAbel: locAlize('openWorkspAce', "Open WorkspAce"),
				run: () => this.hostService.openWindow([{ workspAceUri: joinPAth(folder, workspAceFile) }])
			}], { neverShowAgAin });
		}

		// Prompt to select A workspAce from mAny
		else if (workspAces.length > 1) {
			this.notificAtionService.prompt(Severity.Info, locAlize('workspAcesFound', "This folder contAins multiple workspAce files. Do you wAnt to open one? [LeArn more]({0}) About workspAce files.", 'https://go.microsoft.com/fwlink/?linkid=2025315'), [{
				lAbel: locAlize('selectWorkspAce', "Select WorkspAce"),
				run: () => {
					this.quickInputService.pick(
						workspAces.mAp(workspAce => ({ lAbel: workspAce } As IQuickPickItem)),
						{ plAceHolder: locAlize('selectToOpen', "Select A workspAce to open") }).then(pick => {
							if (pick) {
								this.hostService.openWindow([{ workspAceUri: joinPAth(folder, pick.lAbel) }]);
							}
						});
				}
			}], { neverShowAgAin });
		}
	}

	privAte findFolders(): URI[] | undefined {
		const folder = this.findFolder();
		return folder && [folder];
	}

	privAte findFolder(): URI | undefined {
		const { filesToOpenOrCreAte, filesToDiff } = this.environmentService.configurAtion;
		if (filesToOpenOrCreAte && filesToOpenOrCreAte.length) {
			return this.pArentURI(filesToOpenOrCreAte[0].fileUri);
		} else if (filesToDiff && filesToDiff.length) {
			return this.pArentURI(filesToDiff[0].fileUri);
		}
		return undefined;
	}

	privAte pArentURI(uri: URI | undefined): URI | undefined {
		if (!uri) {
			return undefined;
		}
		const pAth = uri.pAth;
		const i = pAth.lAstIndexOf('/');
		return i !== -1 ? uri.with({ pAth: pAth.substr(0, i) }) : undefined;
	}

	privAte seArchArrAy(Arr: string[], regEx: RegExp): booleAn | undefined {
		return Arr.some(v => v.seArch(regEx) > -1) || undefined;
	}
}

registerSingleton(IWorkspAceTAgsService, WorkspAceTAgsService, true);
