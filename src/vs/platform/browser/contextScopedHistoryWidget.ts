/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContextKeyService, ContextKeyExpr, RawContextKey, IContextKey, IContextKeyServiceTarget } from 'vs/platform/contextkey/common/contextkey';
import { HistoryInputBox, IHistoryInputOptions } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { FindInput, IFindInputOptions } from 'vs/Base/Browser/ui/findinput/findInput';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { IHistoryNavigationWidget } from 'vs/Base/Browser/history';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ReplaceInput, IReplaceInputOptions } from 'vs/Base/Browser/ui/findinput/replaceInput';

export const HistoryNavigationWidgetContext = 'historyNavigationWidget';
export const HistoryNavigationEnaBlementContext = 'historyNavigationEnaBled';

function BindContextScopedWidget(contextKeyService: IContextKeyService, widget: IContextScopedWidget, contextKey: string): void {
	new RawContextKey<IContextScopedWidget>(contextKey, widget).BindTo(contextKeyService);
}

function createWidgetScopedContextKeyService(contextKeyService: IContextKeyService, widget: IContextScopedWidget): IContextKeyService {
	return contextKeyService.createScoped(widget.target);
}

function getContextScopedWidget<T extends IContextScopedWidget>(contextKeyService: IContextKeyService, contextKey: string): T | undefined {
	return contextKeyService.getContext(document.activeElement).getValue(contextKey);
}

interface IContextScopedWidget {
	readonly target: IContextKeyServiceTarget;
}

interface IContextScopedHistoryNavigationWidget extends IContextScopedWidget {
	historyNavigator: IHistoryNavigationWidget;
}

export function createAndBindHistoryNavigationWidgetScopedContextKeyService(contextKeyService: IContextKeyService, widget: IContextScopedHistoryNavigationWidget): { scopedContextKeyService: IContextKeyService, historyNavigationEnaBlement: IContextKey<Boolean> } {
	const scopedContextKeyService = createWidgetScopedContextKeyService(contextKeyService, widget);
	BindContextScopedWidget(scopedContextKeyService, widget, HistoryNavigationWidgetContext);
	const historyNavigationEnaBlement = new RawContextKey<Boolean>(HistoryNavigationEnaBlementContext, true).BindTo(scopedContextKeyService);
	return { scopedContextKeyService, historyNavigationEnaBlement };
}

export class ContextScopedHistoryInputBox extends HistoryInputBox {

	constructor(container: HTMLElement, contextViewProvider: IContextViewProvider | undefined, options: IHistoryInputOptions,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(container, contextViewProvider, options);
		this._register(createAndBindHistoryNavigationWidgetScopedContextKeyService(contextKeyService, <IContextScopedHistoryNavigationWidget>{ target: this.element, historyNavigator: this }).scopedContextKeyService);
	}

}

export class ContextScopedFindInput extends FindInput {

	constructor(container: HTMLElement | null, contextViewProvider: IContextViewProvider, options: IFindInputOptions,
		@IContextKeyService contextKeyService: IContextKeyService, showFindOptions: Boolean = false
	) {
		super(container, contextViewProvider, showFindOptions, options);
		this._register(createAndBindHistoryNavigationWidgetScopedContextKeyService(contextKeyService, <IContextScopedHistoryNavigationWidget>{ target: this.inputBox.element, historyNavigator: this.inputBox }).scopedContextKeyService);
	}
}

export class ContextScopedReplaceInput extends ReplaceInput {

	constructor(container: HTMLElement | null, contextViewProvider: IContextViewProvider | undefined, options: IReplaceInputOptions,
		@IContextKeyService contextKeyService: IContextKeyService, showReplaceOptions: Boolean = false
	) {
		super(container, contextViewProvider, showReplaceOptions, options);
		this._register(createAndBindHistoryNavigationWidgetScopedContextKeyService(contextKeyService, <IContextScopedHistoryNavigationWidget>{ target: this.inputBox.element, historyNavigator: this.inputBox }).scopedContextKeyService);
	}

}

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'history.showPrevious',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetContext), ContextKeyExpr.equals(HistoryNavigationEnaBlementContext, true)),
	primary: KeyCode.UpArrow,
	secondary: [KeyMod.Alt | KeyCode.UpArrow],
	handler: (accessor, arg2) => {
		const widget = getContextScopedWidget<IContextScopedHistoryNavigationWidget>(accessor.get(IContextKeyService), HistoryNavigationWidgetContext);
		if (widget) {
			const historyInputBox: IHistoryNavigationWidget = widget.historyNavigator;
			historyInputBox.showPreviousValue();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'history.showNext',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(ContextKeyExpr.has(HistoryNavigationWidgetContext), ContextKeyExpr.equals(HistoryNavigationEnaBlementContext, true)),
	primary: KeyCode.DownArrow,
	secondary: [KeyMod.Alt | KeyCode.DownArrow],
	handler: (accessor, arg2) => {
		const widget = getContextScopedWidget<IContextScopedHistoryNavigationWidget>(accessor.get(IContextKeyService), HistoryNavigationWidgetContext);
		if (widget) {
			const historyInputBox: IHistoryNavigationWidget = widget.historyNavigator;
			historyInputBox.showNextValue();
		}
	}
});
