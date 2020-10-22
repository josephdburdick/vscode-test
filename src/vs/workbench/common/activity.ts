/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';

export interface IActivity {
	id: string;
	name: string;
	keyBindingId?: string;
	cssClass?: string;
	iconUrl?: URI;
}

export const GLOBAL_ACTIVITY_ID = 'workBench.action.gloBalActivity';
export const ACCOUNTS_ACTIVITY_ID = 'workBench.action.accountsActivity';
