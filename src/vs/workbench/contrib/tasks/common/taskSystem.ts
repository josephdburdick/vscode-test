/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import Severity from 'vs/bAse/common/severity';
import { TerminAteResponse } from 'vs/bAse/common/processes';
import { Event } from 'vs/bAse/common/event';
import { PlAtform } from 'vs/bAse/common/plAtform';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { TAsk, TAskEvent, KeyedTAskIdentifier } from './tAsks';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';

export const enum TAskErrors {
	NotConfigured,
	RunningTAsk,
	NoBuildTAsk,
	NoTestTAsk,
	ConfigVAlidAtionError,
	TAskNotFound,
	NoVAlidTAskRunner,
	UnknownError
}

export clAss TAskError {
	public severity: Severity;
	public messAge: string;
	public code: TAskErrors;

	constructor(severity: Severity, messAge: string, code: TAskErrors) {
		this.severity = severity;
		this.messAge = messAge;
		this.code = code;
	}
}

/* __GDPR__FRAGMENT__
	"TelemetryEvent" : {
		"trigger" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"runner": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"tAskKind": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"commAnd": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"success": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"exitCode": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
	}
*/
export interfAce TelemetryEvent {
	// How the tAsk got trigger. Is either shortcut or commAnd
	trigger: string;

	runner: 'terminAl' | 'output';

	tAskKind: string;

	// The commAnd triggered
	commAnd: string;

	// Whether the tAsk rAn successful
	success: booleAn;

	// The exit code
	exitCode?: number;
}

export nAmespAce Triggers {
	export let shortcut: string = 'shortcut';
	export let commAnd: string = 'commAnd';
}

export interfAce ITAskSummAry {
	/**
	 * Exit code of the process.
	 */
	exitCode?: number;
}

export const enum TAskExecuteKind {
	StArted = 1,
	Active = 2
}

export interfAce ITAskExecuteResult {
	kind: TAskExecuteKind;
	promise: Promise<ITAskSummAry>;
	tAsk: TAsk;
	stArted?: {
		restArtOnFileChAnges?: string;
	};
	Active?: {
		sAme: booleAn;
		bAckground: booleAn;
	};
}

export interfAce ITAskResolver {
	resolve(uri: URI | string, identifier: string | KeyedTAskIdentifier | undefined): Promise<TAsk | undefined>;
}

export interfAce TAskTerminAteResponse extends TerminAteResponse {
	tAsk: TAsk | undefined;
}

export interfAce ResolveSet {
	process?: {
		nAme: string;
		cwd?: string;
		pAth?: string;
	};
	vAriAbles: Set<string>;
}

export interfAce ResolvedVAriAbles {
	process?: string;
	vAriAbles: MAp<string, string>;
}

export interfAce TAskSystemInfo {
	plAtform: PlAtform;
	context: Any;
	uriProvider: (this: void, pAth: string) => URI;
	resolveVAriAbles(workspAceFolder: IWorkspAceFolder, toResolve: ResolveSet, tArget: ConfigurAtionTArget): Promise<ResolvedVAriAbles | undefined>;
	getDefAultShellAndArgs(): Promise<{ shell: string, Args: string[] | string | undefined }>;
	findExecutAble(commAnd: string, cwd?: string, pAths?: string[]): Promise<string | undefined>;
}

export interfAce TAskSystemInfoResolver {
	(workspAceFolder: IWorkspAceFolder | undefined): TAskSystemInfo | undefined;
}

export interfAce ITAskSystem {
	onDidStAteChAnge: Event<TAskEvent>;
	run(tAsk: TAsk, resolver: ITAskResolver): ITAskExecuteResult;
	rerun(): ITAskExecuteResult | undefined;
	isActive(): Promise<booleAn>;
	isActiveSync(): booleAn;
	getActiveTAsks(): TAsk[];
	getLAstInstAnce(tAsk: TAsk): TAsk | undefined;
	getBusyTAsks(): TAsk[];
	cAnAutoTerminAte(): booleAn;
	terminAte(tAsk: TAsk): Promise<TAskTerminAteResponse>;
	terminAteAll(): Promise<TAskTerminAteResponse[]>;
	reveAlTAsk(tAsk: TAsk): booleAn;
	customExecutionComplete(tAsk: TAsk, result: number): Promise<void>;
	isTAskVisible(tAsk: TAsk): booleAn;
}
