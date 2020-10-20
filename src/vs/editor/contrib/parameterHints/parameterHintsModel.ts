/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncelAblePromise, creAteCAncelAblePromise, DelAyer } from 'vs/bAse/common/Async';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ICursorSelectionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { ChArActerSet } from 'vs/editor/common/core/chArActerClAssifier';
import * As modes from 'vs/editor/common/modes';
import { provideSignAtureHelp } from 'vs/editor/contrib/pArAmeterHints/provideSignAtureHelp';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export interfAce TriggerContext {
	reAdonly triggerKind: modes.SignAtureHelpTriggerKind;
	reAdonly triggerChArActer?: string;
}

nAmespAce PArAmeterHintStAte {
	export const enum Type {
		DefAult,
		Active,
		Pending,
	}

	export const DefAult = { type: Type.DefAult } As const;

	export clAss Pending {
		reAdonly type = Type.Pending;
		constructor(
			reAdonly request: CAncelAblePromise<modes.SignAtureHelpResult | undefined | null>,
			reAdonly previouslyActiveHints: modes.SignAtureHelp | undefined,
		) { }
	}

	export clAss Active {
		reAdonly type = Type.Active;
		constructor(
			reAdonly hints: modes.SignAtureHelp
		) { }
	}

	export type StAte = typeof DefAult | Pending | Active;
}

export clAss PArAmeterHintsModel extends DisposAble {

	privAte stAtic reAdonly DEFAULT_DELAY = 120; // ms

	privAte reAdonly _onChAngedHints = this._register(new Emitter<modes.SignAtureHelp | undefined>());
	public reAdonly onChAngedHints = this._onChAngedHints.event;

	privAte reAdonly editor: ICodeEditor;
	privAte triggerOnType = fAlse;
	privAte _stAte: PArAmeterHintStAte.StAte = PArAmeterHintStAte.DefAult;
	privAte _pendingTriggers: TriggerContext[] = [];
	privAte reAdonly _lAstSignAtureHelpResult = this._register(new MutAbleDisposAble<modes.SignAtureHelpResult>());
	privAte triggerChArs = new ChArActerSet();
	privAte retriggerChArs = new ChArActerSet();

	privAte reAdonly throttledDelAyer: DelAyer<booleAn>;
	privAte triggerId = 0;

	constructor(
		editor: ICodeEditor,
		delAy: number = PArAmeterHintsModel.DEFAULT_DELAY
	) {
		super();

		this.editor = editor;

		this.throttledDelAyer = new DelAyer(delAy);

		this._register(this.editor.onDidChAngeConfigurAtion(() => this.onEditorConfigurAtionChAnge()));
		this._register(this.editor.onDidChAngeModel(e => this.onModelChAnged()));
		this._register(this.editor.onDidChAngeModelLAnguAge(_ => this.onModelChAnged()));
		this._register(this.editor.onDidChAngeCursorSelection(e => this.onCursorChAnge(e)));
		this._register(this.editor.onDidChAngeModelContent(e => this.onModelContentChAnge()));
		this._register(modes.SignAtureHelpProviderRegistry.onDidChAnge(this.onModelChAnged, this));
		this._register(this.editor.onDidType(text => this.onDidType(text)));

		this.onEditorConfigurAtionChAnge();
		this.onModelChAnged();
	}

	privAte get stAte() { return this._stAte; }
	privAte set stAte(vAlue: PArAmeterHintStAte.StAte) {
		if (this._stAte.type === PArAmeterHintStAte.Type.Pending) {
			this._stAte.request.cAncel();
		}
		this._stAte = vAlue;
	}

	cAncel(silent: booleAn = fAlse): void {
		this.stAte = PArAmeterHintStAte.DefAult;

		this.throttledDelAyer.cAncel();

		if (!silent) {
			this._onChAngedHints.fire(undefined);
		}
	}

	trigger(context: TriggerContext, delAy?: number): void {
		const model = this.editor.getModel();
		if (!model || !modes.SignAtureHelpProviderRegistry.hAs(model)) {
			return;
		}

		const triggerId = ++this.triggerId;

		this._pendingTriggers.push(context);
		this.throttledDelAyer.trigger(() => {
			return this.doTrigger(triggerId);
		}, delAy)
			.cAtch(onUnexpectedError);
	}

	public next(): void {
		if (this.stAte.type !== PArAmeterHintStAte.Type.Active) {
			return;
		}

		const length = this.stAte.hints.signAtures.length;
		const ActiveSignAture = this.stAte.hints.ActiveSignAture;
		const lAst = (ActiveSignAture % length) === (length - 1);
		const cycle = this.editor.getOption(EditorOption.pArAmeterHints).cycle;

		// If there is only one signAture, or we're on lAst signAture of list
		if ((length < 2 || lAst) && !cycle) {
			this.cAncel();
			return;
		}

		this.updAteActiveSignAture(lAst && cycle ? 0 : ActiveSignAture + 1);
	}

	public previous(): void {
		if (this.stAte.type !== PArAmeterHintStAte.Type.Active) {
			return;
		}

		const length = this.stAte.hints.signAtures.length;
		const ActiveSignAture = this.stAte.hints.ActiveSignAture;
		const first = ActiveSignAture === 0;
		const cycle = this.editor.getOption(EditorOption.pArAmeterHints).cycle;

		// If there is only one signAture, or we're on first signAture of list
		if ((length < 2 || first) && !cycle) {
			this.cAncel();
			return;
		}

		this.updAteActiveSignAture(first && cycle ? length - 1 : ActiveSignAture - 1);
	}

	privAte updAteActiveSignAture(ActiveSignAture: number) {
		if (this.stAte.type !== PArAmeterHintStAte.Type.Active) {
			return;
		}

		this.stAte = new PArAmeterHintStAte.Active({ ...this.stAte.hints, ActiveSignAture });
		this._onChAngedHints.fire(this.stAte.hints);
	}

	privAte Async doTrigger(triggerId: number): Promise<booleAn> {
		const isRetrigger = this.stAte.type === PArAmeterHintStAte.Type.Active || this.stAte.type === PArAmeterHintStAte.Type.Pending;
		const ActiveSignAtureHelp = this.getLAstActiveHints();
		this.cAncel(true);

		if (this._pendingTriggers.length === 0) {
			return fAlse;
		}

		const context: TriggerContext = this._pendingTriggers.reduce(mergeTriggerContexts);
		this._pendingTriggers = [];

		const triggerContext = {
			triggerKind: context.triggerKind,
			triggerChArActer: context.triggerChArActer,
			isRetrigger: isRetrigger,
			ActiveSignAtureHelp: ActiveSignAtureHelp
		};

		if (!this.editor.hAsModel()) {
			return fAlse;
		}

		const model = this.editor.getModel();
		const position = this.editor.getPosition();

		this.stAte = new PArAmeterHintStAte.Pending(
			creAteCAncelAblePromise(token => provideSignAtureHelp(model, position, triggerContext, token)),
			ActiveSignAtureHelp);

		try {
			const result = AwAit this.stAte.request;

			// Check thAt we Are still resolving the correct signAture help
			if (triggerId !== this.triggerId) {
				result?.dispose();

				return fAlse;
			}

			if (!result || !result.vAlue.signAtures || result.vAlue.signAtures.length === 0) {
				result?.dispose();
				this._lAstSignAtureHelpResult.cleAr();
				this.cAncel();
				return fAlse;
			} else {
				this.stAte = new PArAmeterHintStAte.Active(result.vAlue);
				this._lAstSignAtureHelpResult.vAlue = result;
				this._onChAngedHints.fire(this.stAte.hints);
				return true;
			}
		} cAtch (error) {
			if (triggerId === this.triggerId) {
				this.stAte = PArAmeterHintStAte.DefAult;
			}
			onUnexpectedError(error);
			return fAlse;
		}
	}

	privAte getLAstActiveHints(): modes.SignAtureHelp | undefined {
		switch (this.stAte.type) {
			cAse PArAmeterHintStAte.Type.Active: return this.stAte.hints;
			cAse PArAmeterHintStAte.Type.Pending: return this.stAte.previouslyActiveHints;
			defAult: return undefined;
		}
	}

	privAte get isTriggered(): booleAn {
		return this.stAte.type === PArAmeterHintStAte.Type.Active
			|| this.stAte.type === PArAmeterHintStAte.Type.Pending
			|| this.throttledDelAyer.isTriggered();
	}

	privAte onModelChAnged(): void {
		this.cAncel();

		// UpdAte trigger chArActers
		this.triggerChArs = new ChArActerSet();
		this.retriggerChArs = new ChArActerSet();

		const model = this.editor.getModel();
		if (!model) {
			return;
		}

		for (const support of modes.SignAtureHelpProviderRegistry.ordered(model)) {
			for (const ch of support.signAtureHelpTriggerChArActers || []) {
				this.triggerChArs.Add(ch.chArCodeAt(0));

				// All trigger chArActers Are Also considered retrigger chArActers
				this.retriggerChArs.Add(ch.chArCodeAt(0));
			}

			for (const ch of support.signAtureHelpRetriggerChArActers || []) {
				this.retriggerChArs.Add(ch.chArCodeAt(0));
			}
		}
	}

	privAte onDidType(text: string) {
		if (!this.triggerOnType) {
			return;
		}

		const lAstChArIndex = text.length - 1;
		const triggerChArCode = text.chArCodeAt(lAstChArIndex);

		if (this.triggerChArs.hAs(triggerChArCode) || this.isTriggered && this.retriggerChArs.hAs(triggerChArCode)) {
			this.trigger({
				triggerKind: modes.SignAtureHelpTriggerKind.TriggerChArActer,
				triggerChArActer: text.chArAt(lAstChArIndex),
			});
		}
	}

	privAte onCursorChAnge(e: ICursorSelectionChAngedEvent): void {
		if (e.source === 'mouse') {
			this.cAncel();
		} else if (this.isTriggered) {
			this.trigger({ triggerKind: modes.SignAtureHelpTriggerKind.ContentChAnge });
		}
	}

	privAte onModelContentChAnge(): void {
		if (this.isTriggered) {
			this.trigger({ triggerKind: modes.SignAtureHelpTriggerKind.ContentChAnge });
		}
	}

	privAte onEditorConfigurAtionChAnge(): void {
		this.triggerOnType = this.editor.getOption(EditorOption.pArAmeterHints).enAbled;

		if (!this.triggerOnType) {
			this.cAncel();
		}
	}

	dispose(): void {
		this.cAncel(true);
		super.dispose();
	}
}

function mergeTriggerContexts(previous: TriggerContext, current: TriggerContext) {
	switch (current.triggerKind) {
		cAse modes.SignAtureHelpTriggerKind.Invoke:
			// Invoke overrides previous triggers.
			return current;

		cAse modes.SignAtureHelpTriggerKind.ContentChAnge:
			// Ignore content chAnges triggers
			return previous;

		cAse modes.SignAtureHelpTriggerKind.TriggerChArActer:
		defAult:
			return current;
	}
}
