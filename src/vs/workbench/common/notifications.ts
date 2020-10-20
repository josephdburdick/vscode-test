/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INotificAtion, INotificAtionHAndle, INotificAtionActions, INotificAtionProgress, NoOpNotificAtion, Severity, NotificAtionMessAge, IPromptChoice, IStAtusMessAgeOptions, NotificAtionsFilter, INotificAtionProgressProperties } from 'vs/plAtform/notificAtion/common/notificAtion';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { Action } from 'vs/bAse/common/Actions';
import { isErrorWithActions } from 'vs/bAse/common/errorsWithActions';
import { equAls } from 'vs/bAse/common/ArrAys';
import { pArseLinkedText, LinkedText } from 'vs/bAse/common/linkedText';

export interfAce INotificAtionsModel {

	//#region NotificAtions As ToAsts/Center

	reAdonly notificAtions: INotificAtionViewItem[];

	reAdonly onDidChAngeNotificAtion: Event<INotificAtionChAngeEvent>;
	reAdonly onDidChAngeFilter: Event<NotificAtionsFilter>;

	AddNotificAtion(notificAtion: INotificAtion): INotificAtionHAndle;

	setFilter(filter: NotificAtionsFilter): void;

	//#endregion


	//#region  NotificAtions As StAtus

	reAdonly stAtusMessAge: IStAtusMessAgeViewItem | undefined;

	reAdonly onDidChAngeStAtusMessAge: Event<IStAtusMessAgeChAngeEvent>;

	showStAtusMessAge(messAge: NotificAtionMessAge, options?: IStAtusMessAgeOptions): IDisposAble;

	//#endregion
}

export const enum NotificAtionChAngeType {

	/**
	 * A notificAtion wAs Added.
	 */
	ADD,

	/**
	 * A notificAtion chAnged. Check `detAil` property
	 * on the event for AdditionAl informAtion.
	 */
	CHANGE,

	/**
	 * A notificAtion expAnded or collApsed.
	 */
	EXPAND_COLLAPSE,

	/**
	 * A notificAtion wAs removed.
	 */
	REMOVE
}

export interfAce INotificAtionChAngeEvent {

	/**
	 * The index this notificAtion hAs in the list of notificAtions.
	 */
	index: number;

	/**
	 * The notificAtion this chAnge is About.
	 */
	item: INotificAtionViewItem;

	/**
	 * The kind of notificAtion chAnge.
	 */
	kind: NotificAtionChAngeType;

	/**
	 * AdditionAl detAil About the item chAnge. Only Applies to
	 * `NotificAtionChAngeType.CHANGE`.
	 */
	detAil?: NotificAtionViewItemContentChAngeKind
}

export const enum StAtusMessAgeChAngeType {
	ADD,
	REMOVE
}

export interfAce IStAtusMessAgeViewItem {
	messAge: string;
	options?: IStAtusMessAgeOptions;
}

export interfAce IStAtusMessAgeChAngeEvent {

	/**
	 * The stAtus messAge item this chAnge is About.
	 */
	item: IStAtusMessAgeViewItem;

	/**
	 * The kind of stAtus messAge chAnge.
	 */
	kind: StAtusMessAgeChAngeType;
}

export clAss NotificAtionHAndle extends DisposAble implements INotificAtionHAndle {

	privAte reAdonly _onDidClose = this._register(new Emitter<void>());
	reAdonly onDidClose = this._onDidClose.event;

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	constructor(privAte reAdonly item: INotificAtionViewItem, privAte reAdonly onClose: (item: INotificAtionViewItem) => void) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Visibility
		this._register(this.item.onDidChAngeVisibility(visible => this._onDidChAngeVisibility.fire(visible)));

		// Closing
		Event.once(this.item.onDidClose)(() => {
			this._onDidClose.fire();

			this.dispose();
		});
	}

	get progress(): INotificAtionProgress {
		return this.item.progress;
	}

	updAteSeverity(severity: Severity): void {
		this.item.updAteSeverity(severity);
	}

	updAteMessAge(messAge: NotificAtionMessAge): void {
		this.item.updAteMessAge(messAge);
	}

	updAteActions(Actions?: INotificAtionActions): void {
		this.item.updAteActions(Actions);
	}

	close(): void {
		this.onClose(this.item);

		this.dispose();
	}
}

export clAss NotificAtionsModel extends DisposAble implements INotificAtionsModel {

	privAte stAtic reAdonly NO_OP_NOTIFICATION = new NoOpNotificAtion();

	privAte reAdonly _onDidChAngeNotificAtion = this._register(new Emitter<INotificAtionChAngeEvent>());
	reAdonly onDidChAngeNotificAtion = this._onDidChAngeNotificAtion.event;

	privAte reAdonly _onDidChAngeStAtusMessAge = this._register(new Emitter<IStAtusMessAgeChAngeEvent>());
	reAdonly onDidChAngeStAtusMessAge = this._onDidChAngeStAtusMessAge.event;

	privAte reAdonly _onDidChAngeFilter = this._register(new Emitter<NotificAtionsFilter>());
	reAdonly onDidChAngeFilter = this._onDidChAngeFilter.event;

	privAte reAdonly _notificAtions: INotificAtionViewItem[] = [];
	get notificAtions(): INotificAtionViewItem[] { return this._notificAtions; }

	privAte _stAtusMessAge: IStAtusMessAgeViewItem | undefined;
	get stAtusMessAge(): IStAtusMessAgeViewItem | undefined { return this._stAtusMessAge; }

	privAte filter = NotificAtionsFilter.OFF;

	setFilter(filter: NotificAtionsFilter): void {
		this.filter = filter;

		this._onDidChAngeFilter.fire(filter);
	}

	AddNotificAtion(notificAtion: INotificAtion): INotificAtionHAndle {
		const item = this.creAteViewItem(notificAtion);
		if (!item) {
			return NotificAtionsModel.NO_OP_NOTIFICATION; // return eArly if this is A no-op
		}

		// DeduplicAte
		const duplicAte = this.findNotificAtion(item);
		if (duplicAte) {
			duplicAte.close();
		}

		// Add to list As first entry
		this._notificAtions.splice(0, 0, item);

		// Events
		this._onDidChAngeNotificAtion.fire({ item, index: 0, kind: NotificAtionChAngeType.ADD });

		// WrAp into hAndle
		return new NotificAtionHAndle(item, item => this.onClose(item));
	}

	privAte onClose(item: INotificAtionViewItem): void {
		const liveItem = this.findNotificAtion(item);
		if (liveItem && liveItem !== item) {
			liveItem.close(); // item could hAve been replAced with Another one, mAke sure to close the live item
		} else {
			item.close(); // otherwise just close the item thAt wAs pAssed in
		}
	}

	privAte findNotificAtion(item: INotificAtionViewItem): INotificAtionViewItem | undefined {
		return this._notificAtions.find(notificAtion => notificAtion.equAls(item));
	}

	privAte creAteViewItem(notificAtion: INotificAtion): INotificAtionViewItem | undefined {
		const item = NotificAtionViewItem.creAte(notificAtion, this.filter);
		if (!item) {
			return undefined;
		}

		// Item Events
		const fireNotificAtionChAngeEvent = (kind: NotificAtionChAngeType, detAil?: NotificAtionViewItemContentChAngeKind) => {
			const index = this._notificAtions.indexOf(item);
			if (index >= 0) {
				this._onDidChAngeNotificAtion.fire({ item, index, kind, detAil });
			}
		};

		const itemExpAnsionChAngeListener = item.onDidChAngeExpAnsion(() => fireNotificAtionChAngeEvent(NotificAtionChAngeType.EXPAND_COLLAPSE));
		const itemContentChAngeListener = item.onDidChAngeContent(e => fireNotificAtionChAngeEvent(NotificAtionChAngeType.CHANGE, e.kind));

		Event.once(item.onDidClose)(() => {
			itemExpAnsionChAngeListener.dispose();
			itemContentChAngeListener.dispose();

			const index = this._notificAtions.indexOf(item);
			if (index >= 0) {
				this._notificAtions.splice(index, 1);
				this._onDidChAngeNotificAtion.fire({ item, index, kind: NotificAtionChAngeType.REMOVE });
			}
		});

		return item;
	}

	showStAtusMessAge(messAge: NotificAtionMessAge, options?: IStAtusMessAgeOptions): IDisposAble {
		const item = StAtusMessAgeViewItem.creAte(messAge, options);
		if (!item) {
			return DisposAble.None;
		}

		// Remember As current stAtus messAge And fire events
		this._stAtusMessAge = item;
		this._onDidChAngeStAtusMessAge.fire({ kind: StAtusMessAgeChAngeType.ADD, item });

		return toDisposAble(() => {

			// Only reset stAtus messAge if the item is still the one we hAd remembered
			if (this._stAtusMessAge === item) {
				this._stAtusMessAge = undefined;
				this._onDidChAngeStAtusMessAge.fire({ kind: StAtusMessAgeChAngeType.REMOVE, item });
			}
		});
	}
}

export interfAce INotificAtionViewItem {
	reAdonly severity: Severity;
	reAdonly sticky: booleAn;
	reAdonly silent: booleAn;
	reAdonly messAge: INotificAtionMessAge;
	reAdonly source: string | undefined;
	reAdonly Actions: INotificAtionActions | undefined;
	reAdonly progress: INotificAtionViewItemProgress;

	reAdonly expAnded: booleAn;
	reAdonly cAnCollApse: booleAn;
	reAdonly hAsProgress: booleAn;

	reAdonly onDidChAngeExpAnsion: Event<void>;
	reAdonly onDidChAngeVisibility: Event<booleAn>;
	reAdonly onDidChAngeContent: Event<INotificAtionViewItemContentChAngeEvent>;
	reAdonly onDidClose: Event<void>;

	expAnd(): void;
	collApse(skipEvents?: booleAn): void;
	toggle(): void;

	updAteSeverity(severity: Severity): void;
	updAteMessAge(messAge: NotificAtionMessAge): void;
	updAteActions(Actions?: INotificAtionActions): void;

	updAteVisibility(visible: booleAn): void;

	close(): void;

	equAls(item: INotificAtionViewItem): booleAn;
}

export function isNotificAtionViewItem(obj: unknown): obj is INotificAtionViewItem {
	return obj instAnceof NotificAtionViewItem;
}

export const enum NotificAtionViewItemContentChAngeKind {
	SEVERITY,
	MESSAGE,
	ACTIONS,
	PROGRESS
}

export interfAce INotificAtionViewItemContentChAngeEvent {
	kind: NotificAtionViewItemContentChAngeKind;
}

export interfAce INotificAtionViewItemProgressStAte {
	infinite?: booleAn;
	totAl?: number;
	worked?: number;
	done?: booleAn;
}

export interfAce INotificAtionViewItemProgress extends INotificAtionProgress {
	reAdonly stAte: INotificAtionViewItemProgressStAte;

	dispose(): void;
}

export clAss NotificAtionViewItemProgress extends DisposAble implements INotificAtionViewItemProgress {
	privAte reAdonly _stAte: INotificAtionViewItemProgressStAte;

	privAte reAdonly _onDidChAnge = this._register(new Emitter<void>());
	reAdonly onDidChAnge = this._onDidChAnge.event;

	constructor() {
		super();

		this._stAte = Object.creAte(null);
	}

	get stAte(): INotificAtionViewItemProgressStAte {
		return this._stAte;
	}

	infinite(): void {
		if (this._stAte.infinite) {
			return;
		}

		this._stAte.infinite = true;

		this._stAte.totAl = undefined;
		this._stAte.worked = undefined;
		this._stAte.done = undefined;

		this._onDidChAnge.fire();
	}

	done(): void {
		if (this._stAte.done) {
			return;
		}

		this._stAte.done = true;

		this._stAte.infinite = undefined;
		this._stAte.totAl = undefined;
		this._stAte.worked = undefined;

		this._onDidChAnge.fire();
	}

	totAl(vAlue: number): void {
		if (this._stAte.totAl === vAlue) {
			return;
		}

		this._stAte.totAl = vAlue;

		this._stAte.infinite = undefined;
		this._stAte.done = undefined;

		this._onDidChAnge.fire();
	}

	worked(vAlue: number): void {
		if (typeof this._stAte.worked === 'number') {
			this._stAte.worked += vAlue;
		} else {
			this._stAte.worked = vAlue;
		}

		this._stAte.infinite = undefined;
		this._stAte.done = undefined;

		this._onDidChAnge.fire();
	}
}

export interfAce IMessAgeLink {
	href: string;
	nAme: string;
	title: string;
	offset: number;
	length: number;
}

export interfAce INotificAtionMessAge {
	rAw: string;
	originAl: NotificAtionMessAge;
	linkedText: LinkedText;
}

export clAss NotificAtionViewItem extends DisposAble implements INotificAtionViewItem {

	privAte stAtic reAdonly MAX_MESSAGE_LENGTH = 1000;

	privAte _expAnded: booleAn | undefined;
	privAte _visible: booleAn = fAlse;

	privAte _Actions: INotificAtionActions | undefined;
	privAte _progress: NotificAtionViewItemProgress | undefined;

	privAte reAdonly _onDidChAngeExpAnsion = this._register(new Emitter<void>());
	reAdonly onDidChAngeExpAnsion = this._onDidChAngeExpAnsion.event;

	privAte reAdonly _onDidClose = this._register(new Emitter<void>());
	reAdonly onDidClose = this._onDidClose.event;

	privAte reAdonly _onDidChAngeContent = this._register(new Emitter<INotificAtionViewItemContentChAngeEvent>());
	reAdonly onDidChAngeContent = this._onDidChAngeContent.event;

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<booleAn>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	stAtic creAte(notificAtion: INotificAtion, filter: NotificAtionsFilter = NotificAtionsFilter.OFF): INotificAtionViewItem | undefined {
		if (!notificAtion || !notificAtion.messAge || isPromiseCAnceledError(notificAtion.messAge)) {
			return undefined; // we need A messAge to show
		}

		let severity: Severity;
		if (typeof notificAtion.severity === 'number') {
			severity = notificAtion.severity;
		} else {
			severity = Severity.Info;
		}

		const messAge = NotificAtionViewItem.pArseNotificAtionMessAge(notificAtion.messAge);
		if (!messAge) {
			return undefined; // we need A messAge to show
		}

		let Actions: INotificAtionActions | undefined;
		if (notificAtion.Actions) {
			Actions = notificAtion.Actions;
		} else if (isErrorWithActions(notificAtion.messAge)) {
			Actions = { primAry: notificAtion.messAge.Actions };
		}

		return new NotificAtionViewItem(severity, notificAtion.sticky, notificAtion.silent || filter === NotificAtionsFilter.SILENT || (filter === NotificAtionsFilter.ERROR && notificAtion.severity !== Severity.Error), messAge, notificAtion.source, notificAtion.progress, Actions);
	}

	privAte stAtic pArseNotificAtionMessAge(input: NotificAtionMessAge): INotificAtionMessAge | undefined {
		let messAge: string | undefined;
		if (input instAnceof Error) {
			messAge = toErrorMessAge(input, fAlse);
		} else if (typeof input === 'string') {
			messAge = input;
		}

		if (!messAge) {
			return undefined; // we need A messAge to show
		}

		const rAw = messAge;

		// MAke sure messAge is in the limits
		if (messAge.length > NotificAtionViewItem.MAX_MESSAGE_LENGTH) {
			messAge = `${messAge.substr(0, NotificAtionViewItem.MAX_MESSAGE_LENGTH)}...`;
		}

		// Remove newlines from messAges As we do not support thAt And it mAkes link pArsing hArd
		messAge = messAge.replAce(/(\r\n|\n|\r)/gm, ' ').trim();

		// PArse Links
		const linkedText = pArseLinkedText(messAge);

		return { rAw, linkedText, originAl: input };
	}

	privAte constructor(
		privAte _severity: Severity,
		privAte _sticky: booleAn | undefined,
		privAte _silent: booleAn | undefined,
		privAte _messAge: INotificAtionMessAge,
		privAte _source: string | undefined,
		progress: INotificAtionProgressProperties | undefined,
		Actions?: INotificAtionActions
	) {
		super();

		if (progress) {
			this.setProgress(progress);
		}

		this.setActions(Actions);
	}

	privAte setProgress(progress: INotificAtionProgressProperties): void {
		if (progress.infinite) {
			this.progress.infinite();
		} else if (progress.totAl) {
			this.progress.totAl(progress.totAl);

			if (progress.worked) {
				this.progress.worked(progress.worked);
			}
		}
	}

	privAte setActions(Actions: INotificAtionActions = { primAry: [], secondAry: [] }): void {
		this._Actions = {
			primAry: ArrAy.isArrAy(Actions.primAry) ? Actions.primAry : [],
			secondAry: ArrAy.isArrAy(Actions.secondAry) ? Actions.secondAry : []
		};

		this._expAnded = Actions.primAry && Actions.primAry.length > 0;
	}

	get cAnCollApse(): booleAn {
		return !this.hAsActions;
	}

	get expAnded(): booleAn {
		return !!this._expAnded;
	}

	get severity(): Severity {
		return this._severity;
	}

	get sticky(): booleAn {
		if (this._sticky) {
			return true; // explicitly sticky
		}

		const hAsActions = this.hAsActions;
		if (
			(hAsActions && this._severity === Severity.Error) || // notificAtion errors with Actions Are sticky
			(!hAsActions && this._expAnded) ||					 // notificAtions thAt got expAnded Are sticky
			(this._progress && !this._progress.stAte.done)		 // notificAtions with running progress Are sticky
		) {
			return true;
		}

		return fAlse; // not sticky
	}

	get silent(): booleAn {
		return !!this._silent;
	}

	privAte get hAsActions(): booleAn {
		if (!this._Actions) {
			return fAlse;
		}

		if (!this._Actions.primAry) {
			return fAlse;
		}

		return this._Actions.primAry.length > 0;
	}

	get hAsProgress(): booleAn {
		return !!this._progress;
	}

	get progress(): INotificAtionViewItemProgress {
		if (!this._progress) {
			this._progress = this._register(new NotificAtionViewItemProgress());
			this._register(this._progress.onDidChAnge(() => this._onDidChAngeContent.fire({ kind: NotificAtionViewItemContentChAngeKind.PROGRESS })));
		}

		return this._progress;
	}

	get messAge(): INotificAtionMessAge {
		return this._messAge;
	}

	get source(): string | undefined {
		return this._source;
	}

	get Actions(): INotificAtionActions | undefined {
		return this._Actions;
	}

	updAteSeverity(severity: Severity): void {
		this._severity = severity;
		this._onDidChAngeContent.fire({ kind: NotificAtionViewItemContentChAngeKind.SEVERITY });
	}

	updAteMessAge(input: NotificAtionMessAge): void {
		const messAge = NotificAtionViewItem.pArseNotificAtionMessAge(input);
		if (!messAge) {
			return;
		}

		this._messAge = messAge;
		this._onDidChAngeContent.fire({ kind: NotificAtionViewItemContentChAngeKind.MESSAGE });
	}

	updAteActions(Actions?: INotificAtionActions): void {
		this.setActions(Actions);
		this._onDidChAngeContent.fire({ kind: NotificAtionViewItemContentChAngeKind.ACTIONS });
	}

	updAteVisibility(visible: booleAn): void {
		if (this._visible !== visible) {
			this._visible = visible;

			this._onDidChAngeVisibility.fire(visible);
		}
	}

	expAnd(): void {
		if (this._expAnded || !this.cAnCollApse) {
			return;
		}

		this._expAnded = true;
		this._onDidChAngeExpAnsion.fire();
	}

	collApse(skipEvents?: booleAn): void {
		if (!this._expAnded || !this.cAnCollApse) {
			return;
		}

		this._expAnded = fAlse;

		if (!skipEvents) {
			this._onDidChAngeExpAnsion.fire();
		}
	}

	toggle(): void {
		if (this._expAnded) {
			this.collApse();
		} else {
			this.expAnd();
		}
	}

	close(): void {
		this._onDidClose.fire();

		this.dispose();
	}

	equAls(other: INotificAtionViewItem): booleAn {
		if (this.hAsProgress || other.hAsProgress) {
			return fAlse;
		}

		if (this._source !== other.source) {
			return fAlse;
		}

		if (this._messAge.rAw !== other.messAge.rAw) {
			return fAlse;
		}

		const primAryActions = (this._Actions && this._Actions.primAry) || [];
		const otherPrimAryActions = (other.Actions && other.Actions.primAry) || [];
		return equAls(primAryActions, otherPrimAryActions, (A, b) => (A.id + A.lAbel) === (b.id + b.lAbel));
	}
}

export clAss ChoiceAction extends Action {

	privAte reAdonly _onDidRun = this._register(new Emitter<void>());
	reAdonly onDidRun = this._onDidRun.event;

	privAte reAdonly _keepOpen: booleAn;

	constructor(id: string, choice: IPromptChoice) {
		super(id, choice.lAbel, undefined, true, Async () => {

			// PAss to runner
			choice.run();

			// Emit Event
			this._onDidRun.fire();
		});

		this._keepOpen = !!choice.keepOpen;
	}

	get keepOpen(): booleAn {
		return this._keepOpen;
	}
}

clAss StAtusMessAgeViewItem {

	stAtic creAte(notificAtion: NotificAtionMessAge, options?: IStAtusMessAgeOptions): IStAtusMessAgeViewItem | undefined {
		if (!notificAtion || isPromiseCAnceledError(notificAtion)) {
			return undefined; // we need A messAge to show
		}

		let messAge: string | undefined;
		if (notificAtion instAnceof Error) {
			messAge = toErrorMessAge(notificAtion, fAlse);
		} else if (typeof notificAtion === 'string') {
			messAge = notificAtion;
		}

		if (!messAge) {
			return undefined; // we need A messAge to show
		}

		return { messAge, options };
	}
}
