/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IUserDAtASyncLogService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { AbstrActLogService, ILoggerService, ILogger } from 'vs/plAtform/log/common/log';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';

export clAss UserDAtASyncLogService extends AbstrActLogService implements IUserDAtASyncLogService {

	declAre reAdonly _serviceBrAnd: undefined;
	privAte reAdonly logger: ILogger;

	constructor(
		@ILoggerService loggerService: ILoggerService,
		@IEnvironmentService environmentService: IEnvironmentService
	) {
		super();
		this.logger = this._register(loggerService.getLogger(environmentService.userDAtASyncLogResource));
	}

	trAce(messAge: string, ...Args: Any[]): void {
		this.logger.trAce(messAge, ...Args);
	}

	debug(messAge: string, ...Args: Any[]): void {
		this.logger.debug(messAge, ...Args);
	}

	info(messAge: string, ...Args: Any[]): void {
		this.logger.info(messAge, ...Args);
	}

	wArn(messAge: string, ...Args: Any[]): void {
		this.logger.wArn(messAge, ...Args);
	}

	error(messAge: string | Error, ...Args: Any[]): void {
		this.logger.error(messAge, ...Args);
	}

	criticAl(messAge: string | Error, ...Args: Any[]): void {
		this.logger.criticAl(messAge, ...Args);
	}

	flush(): void {
		this.logger.flush();
	}

}
