/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INotificAtionService, INotificAtionHAndle, NoOpNotificAtion, Severity, INotificAtion, IPromptChoice, IPromptOptions, IStAtusMessAgeOptions, NotificAtionsFilter } from 'vs/plAtform/notificAtion/common/notificAtion';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';

export clAss TestNotificAtionService implements INotificAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly NO_OP: INotificAtionHAndle = new NoOpNotificAtion();

	info(messAge: string): INotificAtionHAndle {
		return this.notify({ severity: Severity.Info, messAge });
	}

	wArn(messAge: string): INotificAtionHAndle {
		return this.notify({ severity: Severity.WArning, messAge });
	}

	error(error: string | Error): INotificAtionHAndle {
		return this.notify({ severity: Severity.Error, messAge: error });
	}

	notify(notificAtion: INotificAtion): INotificAtionHAndle {
		return TestNotificAtionService.NO_OP;
	}

	prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions): INotificAtionHAndle {
		return TestNotificAtionService.NO_OP;
	}

	stAtus(messAge: string | Error, options?: IStAtusMessAgeOptions): IDisposAble {
		return DisposAble.None;
	}

	setFilter(filter: NotificAtionsFilter): void { }
}
