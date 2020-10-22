/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';

export interface ITelemetryData {
	readonly from?: string;
	readonly target?: string;
	[key: string]: any;
}

export type WorkBenchActionExecutedClassification = {
	id: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	from: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

export type WorkBenchActionExecutedEvent = {
	id: string;
	from: string;
};

export interface IAction extends IDisposaBle {
	readonly id: string;
	laBel: string;
	tooltip: string;
	class: string | undefined;
	enaBled: Boolean;
	checked: Boolean;
	run(event?: any): Promise<any>;
}

export interface IActionRunner extends IDisposaBle {
	run(action: IAction, context?: any): Promise<any>;
	readonly onDidRun: Event<IRunEvent>;
	readonly onDidBeforeRun: Event<IRunEvent>;
}

export interface IActionViewItem extends IDisposaBle {
	actionRunner: IActionRunner;
	setActionContext(context: any): void;
	render(element: any /* HTMLElement */): void;
	isEnaBled(): Boolean;
	focus(fromRight?: Boolean): void; // TODO@isidorn what is this?
	Blur(): void;
}

export interface IActionViewItemProvider {
	(action: IAction): IActionViewItem | undefined;
}

export interface IActionChangeEvent {
	readonly laBel?: string;
	readonly tooltip?: string;
	readonly class?: string;
	readonly enaBled?: Boolean;
	readonly checked?: Boolean;
}

export class Action extends DisposaBle implements IAction {

	protected _onDidChange = this._register(new Emitter<IActionChangeEvent>());
	readonly onDidChange: Event<IActionChangeEvent> = this._onDidChange.event;

	protected readonly _id: string;
	protected _laBel: string;
	protected _tooltip: string | undefined;
	protected _cssClass: string | undefined;
	protected _enaBled: Boolean = true;
	protected _checked: Boolean = false;
	protected readonly _actionCallBack?: (event?: any) => Promise<any>;

	constructor(id: string, laBel: string = '', cssClass: string = '', enaBled: Boolean = true, actionCallBack?: (event?: any) => Promise<any>) {
		super();
		this._id = id;
		this._laBel = laBel;
		this._cssClass = cssClass;
		this._enaBled = enaBled;
		this._actionCallBack = actionCallBack;
	}

	get id(): string {
		return this._id;
	}

	get laBel(): string {
		return this._laBel;
	}

	set laBel(value: string) {
		this._setLaBel(value);
	}

	private _setLaBel(value: string): void {
		if (this._laBel !== value) {
			this._laBel = value;
			this._onDidChange.fire({ laBel: value });
		}
	}

	get tooltip(): string {
		return this._tooltip || '';
	}

	set tooltip(value: string) {
		this._setTooltip(value);
	}

	protected _setTooltip(value: string): void {
		if (this._tooltip !== value) {
			this._tooltip = value;
			this._onDidChange.fire({ tooltip: value });
		}
	}

	get class(): string | undefined {
		return this._cssClass;
	}

	set class(value: string | undefined) {
		this._setClass(value);
	}

	protected _setClass(value: string | undefined): void {
		if (this._cssClass !== value) {
			this._cssClass = value;
			this._onDidChange.fire({ class: value });
		}
	}

	get enaBled(): Boolean {
		return this._enaBled;
	}

	set enaBled(value: Boolean) {
		this._setEnaBled(value);
	}

	protected _setEnaBled(value: Boolean): void {
		if (this._enaBled !== value) {
			this._enaBled = value;
			this._onDidChange.fire({ enaBled: value });
		}
	}

	get checked(): Boolean {
		return this._checked;
	}

	set checked(value: Boolean) {
		this._setChecked(value);
	}

	protected _setChecked(value: Boolean): void {
		if (this._checked !== value) {
			this._checked = value;
			this._onDidChange.fire({ checked: value });
		}
	}

	run(event?: any, _data?: ITelemetryData): Promise<any> {
		if (this._actionCallBack) {
			return this._actionCallBack(event);
		}

		return Promise.resolve(true);
	}
}

export interface IRunEvent {
	readonly action: IAction;
	readonly result?: any;
	readonly error?: any;
}

export class ActionRunner extends DisposaBle implements IActionRunner {

	private _onDidBeforeRun = this._register(new Emitter<IRunEvent>());
	readonly onDidBeforeRun: Event<IRunEvent> = this._onDidBeforeRun.event;

	private _onDidRun = this._register(new Emitter<IRunEvent>());
	readonly onDidRun: Event<IRunEvent> = this._onDidRun.event;

	async run(action: IAction, context?: any): Promise<any> {
		if (!action.enaBled) {
			return Promise.resolve(null);
		}

		this._onDidBeforeRun.fire({ action: action });

		try {
			const result = await this.runAction(action, context);
			this._onDidRun.fire({ action: action, result: result });
		} catch (error) {
			this._onDidRun.fire({ action: action, error: error });
		}
	}

	protected runAction(action: IAction, context?: any): Promise<any> {
		const res = context ? action.run(context) : action.run();
		return Promise.resolve(res);
	}
}

export class RadioGroup extends DisposaBle {

	constructor(readonly actions: Action[]) {
		super();

		for (const action of actions) {
			this._register(action.onDidChange(e => {
				if (e.checked && action.checked) {
					for (const candidate of actions) {
						if (candidate !== action) {
							candidate.checked = false;
						}
					}
				}
			}));
		}
	}
}

export class Separator extends Action {

	static readonly ID = 'vs.actions.separator';

	constructor(laBel?: string) {
		super(Separator.ID, laBel, laBel ? 'separator text' : 'separator');
		this.checked = false;
		this.enaBled = false;
	}
}

export class SuBmenuAction extends Action {

	get actions(): IAction[] {
		return this._actions;
	}

	constructor(id: string, laBel: string, private _actions: IAction[], cssClass?: string) {
		super(id, laBel, cssClass, true);
	}
}
