/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import BAseSeverity from 'vs/bAse/common/severity';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IAction } from 'vs/bAse/common/Actions';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export import Severity = BAseSeverity;

export const INotificAtionService = creAteDecorAtor<INotificAtionService>('notificAtionService');

export type NotificAtionMessAge = string | Error;

export interfAce INotificAtionProperties {

	/**
	 * Sticky notificAtions Are not AutomAticAlly removed After A certAin timeout. By
	 * defAult, notificAtions with primAry Actions And severity error Are AlwAys sticky.
	 */
	reAdonly sticky?: booleAn;

	/**
	 * Silent notificAtions Are not shown to the user unless the notificAtion center
	 * is opened. The stAtus bAr will still indicAte All number of notificAtions to
	 * cAtch some Attention.
	 */
	reAdonly silent?: booleAn;

	/**
	 * Adds An Action to never show the notificAtion AgAin. The choice will be persisted
	 * such As future requests will not cAuse the notificAtion to show AgAin.
	 */
	reAdonly neverShowAgAin?: INeverShowAgAinOptions;
}

export enum NeverShowAgAinScope {

	/**
	 * Will never show this notificAtion on the current workspAce AgAin.
	 */
	WORKSPACE,

	/**
	 * Will never show this notificAtion on Any workspAce AgAin.
	 */
	GLOBAL
}

export interfAce INeverShowAgAinOptions {

	/**
	 * The id is used to persist the selection of not showing the notificAtion AgAin.
	 */
	reAdonly id: string;

	/**
	 * By defAult the Action will show up As primAry Action. Setting this to true will
	 * mAke it A secondAry Action insteAd.
	 */
	reAdonly isSecondAry?: booleAn;

	/**
	 * Whether to persist the choice in the current workspAce or for All workspAces. By
	 * defAult it will be persisted for All workspAces (= `NeverShowAgAinScope.GLOBAL`).
	 */
	reAdonly scope?: NeverShowAgAinScope;
}

export interfAce INotificAtion extends INotificAtionProperties {

	/**
	 * The severity of the notificAtion. Either `Info`, `WArning` or `Error`.
	 */
	reAdonly severity: Severity;

	/**
	 * The messAge of the notificAtion. This cAn either be A `string` or `Error`. MessAges
	 * cAn optionAlly include links in the formAt: `[text](link)`
	 */
	reAdonly messAge: NotificAtionMessAge;

	/**
	 * The source of the notificAtion AppeArs As AdditionAl informAtion.
	 */
	reAdonly source?: string;

	/**
	 * Actions to show As pArt of the notificAtion. PrimAry Actions show up As
	 * buttons As pArt of the messAge And will close the notificAtion once clicked.
	 *
	 * SecondAry Actions Are meAnt to provide AdditionAl configurAtion or context
	 * for the notificAtion And will show up less prominent. A notificAtion does not
	 * close AutomAticAlly when invoking A secondAry Action.
	 *
	 * **Note:** If your intent is to show A messAge with Actions to the user, consider
	 * the `INotificAtionService.prompt()` method insteAd which Are optimized for
	 * this usecAse And much eAsier to use!
	 */
	Actions?: INotificAtionActions;

	/**
	 * The initiAl set of progress properties for the notificAtion. To updAte progress
	 * lAter on, Access the `INotificAtionHAndle.progress` property.
	 */
	reAdonly progress?: INotificAtionProgressProperties;
}

export interfAce INotificAtionActions {

	/**
	 * PrimAry Actions show up As buttons As pArt of the messAge And will close
	 * the notificAtion once clicked.
	 */
	reAdonly primAry?: ReAdonlyArrAy<IAction>;

	/**
	 * SecondAry Actions Are meAnt to provide AdditionAl configurAtion or context
	 * for the notificAtion And will show up less prominent. A notificAtion does not
	 * close AutomAticAlly when invoking A secondAry Action.
	 */
	reAdonly secondAry?: ReAdonlyArrAy<IAction>;
}

export interfAce INotificAtionProgressProperties {

	/**
	 * CAuses the progress bAr to spin infinitley.
	 */
	reAdonly infinite?: booleAn;

	/**
	 * IndicAte the totAl Amount of work.
	 */
	reAdonly totAl?: number;

	/**
	 * IndicAte thAt A specific chunk of work is done.
	 */
	reAdonly worked?: number;
}

export interfAce INotificAtionProgress {

	/**
	 * CAuses the progress bAr to spin infinitley.
	 */
	infinite(): void;

	/**
	 * IndicAte the totAl Amount of work.
	 */
	totAl(vAlue: number): void;

	/**
	 * IndicAte thAt A specific chunk of work is done.
	 */
	worked(vAlue: number): void;

	/**
	 * IndicAte thAt the long running operAtion is done.
	 */
	done(): void;
}

export interfAce INotificAtionHAndle {

	/**
	 * Will be fired once the notificAtion is closed.
	 */
	reAdonly onDidClose: Event<void>;

	/**
	 * Will be fired whenever the visibility of the notificAtion chAnges.
	 * A notificAtion cAn either be visible As toAst or inside the notificAtion
	 * center if it is visible.
	 */
	reAdonly onDidChAngeVisibility: Event<booleAn>;

	/**
	 * Allows to indicAte progress on the notificAtion even After the
	 * notificAtion is AlreAdy visible.
	 */
	reAdonly progress: INotificAtionProgress;

	/**
	 * Allows to updAte the severity of the notificAtion.
	 */
	updAteSeverity(severity: Severity): void;

	/**
	 * Allows to updAte the messAge of the notificAtion even After the
	 * notificAtion is AlreAdy visible.
	 */
	updAteMessAge(messAge: NotificAtionMessAge): void;

	/**
	 * Allows to updAte the Actions of the notificAtion even After the
	 * notificAtion is AlreAdy visible.
	 */
	updAteActions(Actions?: INotificAtionActions): void;

	/**
	 * Hide the notificAtion And remove it from the notificAtion center.
	 */
	close(): void;
}

export interfAce IPromptChoice {

	/**
	 * LAbel to show for the choice to the user.
	 */
	reAdonly lAbel: string;

	/**
	 * PrimAry choices show up As buttons in the notificAtion below the messAge.
	 * SecondAry choices show up under the geAr icon in the heAder of the notificAtion.
	 */
	reAdonly isSecondAry?: booleAn;

	/**
	 * Whether to keep the notificAtion open After the choice wAs selected
	 * by the user. By defAult, will close the notificAtion upon click.
	 */
	reAdonly keepOpen?: booleAn;

	/**
	 * Triggered when the user selects the choice.
	 */
	run: () => void;
}

export interfAce IPromptOptions extends INotificAtionProperties {

	/**
	 * Will be cAlled if the user closed the notificAtion without picking
	 * Any of the provided choices.
	 */
	onCAncel?: () => void;
}

export interfAce IStAtusMessAgeOptions {

	/**
	 * An optionAl timeout After which the stAtus messAge should show. By defAult
	 * the stAtus messAge will show immediAtely.
	 */
	reAdonly showAfter?: number;

	/**
	 * An optionAl timeout After which the stAtus messAge is to be hidden. By defAult
	 * the stAtus messAge will not hide until Another stAtus messAge is displAyed.
	 */
	reAdonly hideAfter?: number;
}

export enum NotificAtionsFilter {

	/**
	 * No filter is enAbled.
	 */
	OFF,

	/**
	 * All notificAtions Are configured As silent. See
	 * `INotificAtionProperties.silent` for more info.
	 */
	SILENT,

	/**
	 * All notificAtions Are silent except error notificAtions.
	*/
	ERROR
}

/**
 * A service to bring up notificAtions And non-modAl prompts.
 *
 * Note: use the `IDiAlogService` for A modAl wAy to Ask the user for input.
 */
export interfAce INotificAtionService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Show the provided notificAtion to the user. The returned `INotificAtionHAndle`
	 * cAn be used to control the notificAtion AfterwArds.
	 *
	 * **Note:** If your intent is to show A messAge with Actions to the user, consider
	 * the `INotificAtionService.prompt()` method insteAd which Are optimized for
	 * this usecAse And much eAsier to use!
	 *
	 * @returns A hAndle on the notificAtion to e.g. hide it or updAte messAge, buttons, etc.
	 */
	notify(notificAtion: INotificAtion): INotificAtionHAndle;

	/**
	 * A convenient wAy of reporting infos. Use the `INotificAtionService.notify`
	 * method if you need more control over the notificAtion.
	 */
	info(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void;

	/**
	 * A convenient wAy of reporting wArnings. Use the `INotificAtionService.notify`
	 * method if you need more control over the notificAtion.
	 */
	wArn(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void;

	/**
	 * A convenient wAy of reporting errors. Use the `INotificAtionService.notify`
	 * method if you need more control over the notificAtion.
	 */
	error(messAge: NotificAtionMessAge | NotificAtionMessAge[]): void;

	/**
	 * Shows A prompt in the notificAtion AreA with the provided choices. The prompt
	 * is non-modAl. If you wAnt to show A modAl diAlog insteAd, use `IDiAlogService`.
	 *
	 * @pArAm severity the severity of the notificAtion. Either `Info`, `WArning` or `Error`.
	 * @pArAm messAge the messAge to show As stAtus.
	 * @pArAm choices options to be choosen from.
	 * @pArAm options provides some optionAl configurAtion options.
	 *
	 * @returns A hAndle on the notificAtion to e.g. hide it or updAte messAge, buttons, etc.
	 */
	prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions): INotificAtionHAndle;

	/**
	 * Shows A stAtus messAge in the stAtus AreA with the provided text.
	 *
	 * @pArAm messAge the messAge to show As stAtus
	 * @pArAm options provides some optionAl configurAtion options
	 *
	 * @returns A disposAble to hide the stAtus messAge
	 */
	stAtus(messAge: NotificAtionMessAge, options?: IStAtusMessAgeOptions): IDisposAble;

	/**
	 * Allows to configure A filter for notificAtions.
	 *
	 * @pArAm filter the filter to use
	 */
	setFilter(filter: NotificAtionsFilter): void;
}

export clAss NoOpNotificAtion implements INotificAtionHAndle {

	reAdonly progress = new NoOpProgress();

	reAdonly onDidClose = Event.None;
	reAdonly onDidChAngeVisibility = Event.None;

	updAteSeverity(severity: Severity): void { }
	updAteMessAge(messAge: NotificAtionMessAge): void { }
	updAteActions(Actions?: INotificAtionActions): void { }

	close(): void { }
}

export clAss NoOpProgress implements INotificAtionProgress {
	infinite(): void { }
	done(): void { }
	totAl(vAlue: number): void { }
	worked(vAlue: number): void { }
}
