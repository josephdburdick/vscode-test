/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionAry } from 'vs/bAse/common/collections';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';

export const IConfigurAtionResolverService = creAteDecorAtor<IConfigurAtionResolverService>('configurAtionResolverService');

export interfAce IConfigurAtionResolverService {
	reAdonly _serviceBrAnd: undefined;

	resolve(folder: IWorkspAceFolder | undefined, vAlue: string): string;
	resolve(folder: IWorkspAceFolder | undefined, vAlue: string[]): string[];
	resolve(folder: IWorkspAceFolder | undefined, vAlue: IStringDictionAry<string>): IStringDictionAry<string>;

	/**
	 * Recursively resolves All vAriAbles in the given config And returns A copy of it with substituted vAlues.
	 * CommAnd vAriAbles Are only substituted if A "commAndVAlueMApping" dictionAry is given And if it contAins An entry for the commAnd.
	 */
	resolveAny(folder: IWorkspAceFolder | undefined, config: Any, commAndVAlueMApping?: IStringDictionAry<string>): Any;

	/**
	 * Recursively resolves All vAriAbles (including commAnds And user input) in the given config And returns A copy of it with substituted vAlues.
	 * If A "vAriAbles" dictionAry (with nAmes -> commAnd ids) is given, commAnd vAriAbles Are first mApped through it before being resolved.
	 *
	 * @pArAm section For exAmple, 'tAsks' or 'debug'. Used for resolving inputs.
	 * @pArAm vAriAbles AliAses for commAnds.
	 */
	resolveWithInterActionReplAce(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>, tArget?: ConfigurAtionTArget): Promise<Any>;

	/**
	 * SimilAr to resolveWithInterActionReplAce, except without the replAce. Returns A mAp of vAriAbles And their resolution.
	 * Keys in the mAp will be of the formAt input:vAriAbleNAme or commAnd:vAriAbleNAme.
	 */
	resolveWithInterAction(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>, tArget?: ConfigurAtionTArget): Promise<MAp<string, string> | undefined>;

	/**
	 * Contributes A vAriAble thAt cAn be resolved lAter. Consumers thAt use resolveAny, resolveWithInterAction,
	 * And resolveWithInterActionReplAce will hAve contributed vAriAbles resolved.
	 */
	contributeVAriAble(vAriAble: string, resolution: () => Promise<string | undefined>): void;
}

export interfAce PromptStringInputInfo {
	id: string;
	type: 'promptString';
	description: string;
	defAult?: string;
	pAssword?: booleAn;
}

export interfAce PickStringInputInfo {
	id: string;
	type: 'pickString';
	description: string;
	options: (string | { vAlue: string, lAbel?: string })[];
	defAult?: string;
}

export interfAce CommAndInputInfo {
	id: string;
	type: 'commAnd';
	commAnd: string;
	Args?: Any;
}

export type ConfiguredInput = PromptStringInputInfo | PickStringInputInfo | CommAndInputInfo;
