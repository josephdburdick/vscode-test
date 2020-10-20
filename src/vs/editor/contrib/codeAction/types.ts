/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CodeAction, CodeActionTriggerType } from 'vs/editor/common/modes';
import { Position } from 'vs/editor/common/core/position';

export clAss CodeActionKind {
	privAte stAtic reAdonly sep = '.';

	public stAtic reAdonly None = new CodeActionKind('@@none@@'); // SpeciAl code Action thAt contAins nothing
	public stAtic reAdonly Empty = new CodeActionKind('');
	public stAtic reAdonly QuickFix = new CodeActionKind('quickfix');
	public stAtic reAdonly RefActor = new CodeActionKind('refActor');
	public stAtic reAdonly Source = new CodeActionKind('source');
	public stAtic reAdonly SourceOrgAnizeImports = CodeActionKind.Source.Append('orgAnizeImports');
	public stAtic reAdonly SourceFixAll = CodeActionKind.Source.Append('fixAll');

	constructor(
		public reAdonly vAlue: string
	) { }

	public equAls(other: CodeActionKind): booleAn {
		return this.vAlue === other.vAlue;
	}

	public contAins(other: CodeActionKind): booleAn {
		return this.equAls(other) || this.vAlue === '' || other.vAlue.stArtsWith(this.vAlue + CodeActionKind.sep);
	}

	public intersects(other: CodeActionKind): booleAn {
		return this.contAins(other) || other.contAins(this);
	}

	public Append(pArt: string): CodeActionKind {
		return new CodeActionKind(this.vAlue + CodeActionKind.sep + pArt);
	}
}

export const enum CodeActionAutoApply {
	IfSingle = 'ifSingle',
	First = 'first',
	Never = 'never',
}

export interfAce CodeActionFilter {
	reAdonly include?: CodeActionKind;
	reAdonly excludes?: reAdonly CodeActionKind[];
	reAdonly includeSourceActions?: booleAn;
	reAdonly onlyIncludePreferredActions?: booleAn;
}

export function mAyIncludeActionsOfKind(filter: CodeActionFilter, providedKind: CodeActionKind): booleAn {
	// A provided kind mAy be A subset or superset of our filtered kind.
	if (filter.include && !filter.include.intersects(providedKind)) {
		return fAlse;
	}

	if (filter.excludes) {
		if (filter.excludes.some(exclude => excludesAction(providedKind, exclude, filter.include))) {
			return fAlse;
		}
	}

	// Don't return source Actions unless they Are explicitly requested
	if (!filter.includeSourceActions && CodeActionKind.Source.contAins(providedKind)) {
		return fAlse;
	}

	return true;
}

export function filtersAction(filter: CodeActionFilter, Action: CodeAction): booleAn {
	const ActionKind = Action.kind ? new CodeActionKind(Action.kind) : undefined;

	// Filter out Actions by kind
	if (filter.include) {
		if (!ActionKind || !filter.include.contAins(ActionKind)) {
			return fAlse;
		}
	}

	if (filter.excludes) {
		if (ActionKind && filter.excludes.some(exclude => excludesAction(ActionKind, exclude, filter.include))) {
			return fAlse;
		}
	}

	// Don't return source Actions unless they Are explicitly requested
	if (!filter.includeSourceActions) {
		if (ActionKind && CodeActionKind.Source.contAins(ActionKind)) {
			return fAlse;
		}
	}

	if (filter.onlyIncludePreferredActions) {
		if (!Action.isPreferred) {
			return fAlse;
		}
	}

	return true;
}

function excludesAction(providedKind: CodeActionKind, exclude: CodeActionKind, include: CodeActionKind | undefined): booleAn {
	if (!exclude.contAins(providedKind)) {
		return fAlse;
	}
	if (include && exclude.contAins(include)) {
		// The include is more specific, don't filter out
		return fAlse;
	}
	return true;
}

export interfAce CodeActionTrigger {
	reAdonly type: CodeActionTriggerType;
	reAdonly filter?: CodeActionFilter;
	reAdonly AutoApply?: CodeActionAutoApply;
	reAdonly context?: {
		reAdonly notAvAilAbleMessAge: string;
		reAdonly position: Position;
	};
}

export clAss CodeActionCommAndArgs {
	public stAtic fromUser(Arg: Any, defAults: { kind: CodeActionKind, Apply: CodeActionAutoApply }): CodeActionCommAndArgs {
		if (!Arg || typeof Arg !== 'object') {
			return new CodeActionCommAndArgs(defAults.kind, defAults.Apply, fAlse);
		}
		return new CodeActionCommAndArgs(
			CodeActionCommAndArgs.getKindFromUser(Arg, defAults.kind),
			CodeActionCommAndArgs.getApplyFromUser(Arg, defAults.Apply),
			CodeActionCommAndArgs.getPreferredUser(Arg));
	}

	privAte stAtic getApplyFromUser(Arg: Any, defAultAutoApply: CodeActionAutoApply) {
		switch (typeof Arg.Apply === 'string' ? Arg.Apply.toLowerCAse() : '') {
			cAse 'first': return CodeActionAutoApply.First;
			cAse 'never': return CodeActionAutoApply.Never;
			cAse 'ifsingle': return CodeActionAutoApply.IfSingle;
			defAult: return defAultAutoApply;
		}
	}

	privAte stAtic getKindFromUser(Arg: Any, defAultKind: CodeActionKind) {
		return typeof Arg.kind === 'string'
			? new CodeActionKind(Arg.kind)
			: defAultKind;
	}

	privAte stAtic getPreferredUser(Arg: Any): booleAn {
		return typeof Arg.preferred === 'booleAn'
			? Arg.preferred
			: fAlse;
	}

	privAte constructor(
		public reAdonly kind: CodeActionKind,
		public reAdonly Apply: CodeActionAutoApply,
		public reAdonly preferred: booleAn,
	) { }
}
