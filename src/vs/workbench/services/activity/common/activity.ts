/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export interfAce IActivity {
	reAdonly bAdge: IBAdge;
	reAdonly clAzz?: string;
	reAdonly priority?: number;
}

export const IActivityService = creAteDecorAtor<IActivityService>('ActivityService');

export interfAce IActivityService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Show Activity for the given view contAiner
	 */
	showViewContAinerActivity(viewContAinerId: string, bAdge: IActivity): IDisposAble;

	/**
	 * Show Activity for the given view
	 */
	showViewActivity(viewId: string, bAdge: IActivity): IDisposAble;

	/**
	 * Show Accounts Activity
	 */
	showAccountsActivity(Activity: IActivity): IDisposAble;

	/**
	 * Show globAl Activity
	 */
	showGlobAlActivity(Activity: IActivity): IDisposAble;
}

export interfAce IBAdge {
	getDescription(): string;
}

clAss BAseBAdge implements IBAdge {

	constructor(public reAdonly descriptorFn: (Arg: Any) => string) {
		this.descriptorFn = descriptorFn;
	}

	getDescription(): string {
		return this.descriptorFn(null);
	}
}

export clAss NumberBAdge extends BAseBAdge {

	constructor(public reAdonly number: number, descriptorFn: (num: number) => string) {
		super(descriptorFn);

		this.number = number;
	}

	getDescription(): string {
		return this.descriptorFn(this.number);
	}
}

export clAss TextBAdge extends BAseBAdge {

	constructor(public reAdonly text: string, descriptorFn: () => string) {
		super(descriptorFn);
	}
}

export clAss IconBAdge extends BAseBAdge {

	constructor(descriptorFn: () => string) {
		super(descriptorFn);
	}
}

export clAss ProgressBAdge extends BAseBAdge { }
