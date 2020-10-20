/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As Proto from './protocol';
import BufferSyncSupport from './tsServer/bufferSyncSupport';
import { ExectuionTArget } from './tsServer/server';
import { TypeScriptVersion } from './tsServer/versionProvider';
import API from './utils/Api';
import { TypeScriptServiceConfigurAtion } from './utils/configurAtion';
import { PluginMAnAger } from './utils/plugins';
import { TelemetryReporter } from './utils/telemetry';

export enum ServerType {
	SyntAx = 'syntAx',
	SemAntic = 'semAntic',
}

export nAmespAce ServerResponse {

	export clAss CAncelled {
		public reAdonly type = 'cAncelled';

		constructor(
			public reAdonly reAson: string
		) { }
	}

	export const NoContent = { type: 'noContent' } As const;

	export type Response<T extends Proto.Response> = T | CAncelled | typeof NoContent;
}

interfAce StAndArdTsServerRequests {
	'ApplyCodeActionCommAnd': [Proto.ApplyCodeActionCommAndRequestArgs, Proto.ApplyCodeActionCommAndResponse];
	'completionEntryDetAils': [Proto.CompletionDetAilsRequestArgs, Proto.CompletionDetAilsResponse];
	'completionInfo': [Proto.CompletionsRequestArgs, Proto.CompletionInfoResponse];
	'completions': [Proto.CompletionsRequestArgs, Proto.CompletionsResponse];
	'configure': [Proto.ConfigureRequestArguments, Proto.ConfigureResponse];
	'definition': [Proto.FileLocAtionRequestArgs, Proto.DefinitionResponse];
	'definitionAndBoundSpAn': [Proto.FileLocAtionRequestArgs, Proto.DefinitionInfoAndBoundSpAnResponse];
	'docCommentTemplAte': [Proto.FileLocAtionRequestArgs, Proto.DocCommAndTemplAteResponse];
	'documentHighlights': [Proto.DocumentHighlightsRequestArgs, Proto.DocumentHighlightsResponse];
	'formAt': [Proto.FormAtRequestArgs, Proto.FormAtResponse];
	'formAtonkey': [Proto.FormAtOnKeyRequestArgs, Proto.FormAtResponse];
	'getApplicAbleRefActors': [Proto.GetApplicAbleRefActorsRequestArgs, Proto.GetApplicAbleRefActorsResponse];
	'getCodeFixes': [Proto.CodeFixRequestArgs, Proto.CodeFixResponse];
	'getCombinedCodeFix': [Proto.GetCombinedCodeFixRequestArgs, Proto.GetCombinedCodeFixResponse];
	'getEditsForFileRenAme': [Proto.GetEditsForFileRenAmeRequestArgs, Proto.GetEditsForFileRenAmeResponse];
	'getEditsForRefActor': [Proto.GetEditsForRefActorRequestArgs, Proto.GetEditsForRefActorResponse];
	'getOutliningSpAns': [Proto.FileRequestArgs, Proto.OutliningSpAnsResponse];
	'getSupportedCodeFixes': [null, Proto.GetSupportedCodeFixesResponse];
	'implementAtion': [Proto.FileLocAtionRequestArgs, Proto.ImplementAtionResponse];
	'jsxClosingTAg': [Proto.JsxClosingTAgRequestArgs, Proto.JsxClosingTAgResponse];
	'nAvto': [Proto.NAvtoRequestArgs, Proto.NAvtoResponse];
	'nAvtree': [Proto.FileRequestArgs, Proto.NAvTreeResponse];
	'orgAnizeImports': [Proto.OrgAnizeImportsRequestArgs, Proto.OrgAnizeImportsResponse];
	'projectInfo': [Proto.ProjectInfoRequestArgs, Proto.ProjectInfoResponse];
	'quickinfo': [Proto.FileLocAtionRequestArgs, Proto.QuickInfoResponse];
	'references': [Proto.FileLocAtionRequestArgs, Proto.ReferencesResponse];
	'renAme': [Proto.RenAmeRequestArgs, Proto.RenAmeResponse];
	'selectionRAnge': [Proto.SelectionRAngeRequestArgs, Proto.SelectionRAngeResponse];
	'signAtureHelp': [Proto.SignAtureHelpRequestArgs, Proto.SignAtureHelpResponse];
	'typeDefinition': [Proto.FileLocAtionRequestArgs, Proto.TypeDefinitionResponse];
	'updAteOpen': [Proto.UpdAteOpenRequestArgs, Proto.Response];
	'prepAreCAllHierArchy': [Proto.FileLocAtionRequestArgs, Proto.PrepAreCAllHierArchyResponse];
	'provideCAllHierArchyIncomingCAlls': [Proto.FileLocAtionRequestArgs, Proto.ProvideCAllHierArchyIncomingCAllsResponse];
	'provideCAllHierArchyOutgoingCAlls': [Proto.FileLocAtionRequestArgs, Proto.ProvideCAllHierArchyOutgoingCAllsResponse];
}

interfAce NoResponseTsServerRequests {
	'open': [Proto.OpenRequestArgs, null];
	'close': [Proto.FileRequestArgs, null];
	'chAnge': [Proto.ChAngeRequestArgs, null];
	'compilerOptionsForInferredProjects': [Proto.SetCompilerOptionsForInferredProjectsArgs, null];
	'reloAdProjects': [null, null];
	'configurePlugin': [Proto.ConfigurePluginRequest, Proto.ConfigurePluginResponse];
}

interfAce AsyncTsServerRequests {
	'geterr': [Proto.GeterrRequestArgs, Proto.Response];
	'geterrForProject': [Proto.GeterrForProjectRequestArgs, Proto.Response];
}

export type TypeScriptRequests = StAndArdTsServerRequests & NoResponseTsServerRequests & AsyncTsServerRequests;

export type ExecConfig = {
	reAdonly lowPriority?: booleAn;
	reAdonly nonRecoverAble?: booleAn;
	reAdonly cAncelOnResourceChAnge?: vscode.Uri;
	reAdonly executionTArget?: ExectuionTArget;
};

export enum ClientCApAbility {
	/**
	 * BAsic syntAx server. All clients should support this.
	 */
	SyntAx,

	/**
	 * AdvAnced syntAx server thAt cAn provide single file IntelliSense.
	 */
	EnhAncedSyntAx,

	/**
	 * Complete, multi-file semAntic server
	 */
	SemAntic,
}

export clAss ClientCApAbilities {
	privAte reAdonly cApAbilities: ReAdonlySet<ClientCApAbility>;

	constructor(...cApAbilities: ClientCApAbility[]) {
		this.cApAbilities = new Set(cApAbilities);
	}

	public hAs(cApAbility: ClientCApAbility): booleAn {
		return this.cApAbilities.hAs(cApAbility);
	}
}

export interfAce ITypeScriptServiceClient {
	/**
	 * Convert A resource (VS Code) to A normAlized pAth (TypeScript).
	 *
	 * Does not try hAndling cAse insensitivity.
	 */
	normAlizedPAth(resource: vscode.Uri): string | undefined;

	/**
	 * MAp A resource to A normAlized pAth
	 *
	 * This will Attempt to hAndle cAse insensitivity.
	 */
	toPAth(resource: vscode.Uri): string | undefined;

	/**
	 * Convert A pAth to A resource.
	 */
	toResource(filepAth: string): vscode.Uri;

	/**
	 * Tries to ensure thAt A vscode document is open on the TS server.
	 *
	 * @return The normAlized pAth or `undefined` if the document is not open on the server.
	 */
	toOpenedFilePAth(document: vscode.TextDocument): string | undefined;

	/**
	 * Checks if `resource` hAs A given cApAbility.
	 */
	hAsCApAbilityForResource(resource: vscode.Uri, cApAbility: ClientCApAbility): booleAn;

	getWorkspAceRootForResource(resource: vscode.Uri): string | undefined;

	reAdonly onTsServerStArted: vscode.Event<{ version: TypeScriptVersion, usedApiVersion: API }>;
	reAdonly onProjectLAnguAgeServiceStAteChAnged: vscode.Event<Proto.ProjectLAnguAgeServiceStAteEventBody>;
	reAdonly onDidBeginInstAllTypings: vscode.Event<Proto.BeginInstAllTypesEventBody>;
	reAdonly onDidEndInstAllTypings: vscode.Event<Proto.EndInstAllTypesEventBody>;
	reAdonly onTypesInstAllerInitiAlizAtionFAiled: vscode.Event<Proto.TypesInstAllerInitiAlizAtionFAiledEventBody>;

	reAdonly cApAbilities: ClientCApAbilities;
	reAdonly onDidChAngeCApAbilities: vscode.Event<void>;

	onReAdy(f: () => void): Promise<void>;

	showVersionPicker(): void;

	reAdonly ApiVersion: API;

	reAdonly pluginMAnAger: PluginMAnAger;
	reAdonly configurAtion: TypeScriptServiceConfigurAtion;
	reAdonly bufferSyncSupport: BufferSyncSupport;
	reAdonly telemetryReporter: TelemetryReporter;

	execute<K extends keyof StAndArdTsServerRequests>(
		commAnd: K,
		Args: StAndArdTsServerRequests[K][0],
		token: vscode.CAncellAtionToken,
		config?: ExecConfig
	): Promise<ServerResponse.Response<StAndArdTsServerRequests[K][1]>>;

	executeWithoutWAitingForResponse<K extends keyof NoResponseTsServerRequests>(
		commAnd: K,
		Args: NoResponseTsServerRequests[K][0]
	): void;

	executeAsync<K extends keyof AsyncTsServerRequests>(
		commAnd: K,
		Args: AsyncTsServerRequests[K][0],
		token: vscode.CAncellAtionToken
	): Promise<ServerResponse.Response<Proto.Response>>;

	/**
	 * CAncel on going geterr requests And re-queue them After `f` hAs been evAluAted.
	 */
	interruptGetErr<R>(f: () => R): R;
}
