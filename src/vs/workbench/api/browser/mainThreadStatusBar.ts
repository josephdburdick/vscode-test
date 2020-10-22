/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStatusBarService, StatusBarAlignment as MainThreadStatusBarAlignment, IStatusBarEntryAccessor, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { MainThreadStatusBarShape, MainContext, IExtHostContext } from '../common/extHost.protocol';
import { ThemeColor } from 'vs/platform/theme/common/themeService';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { dispose } from 'vs/Base/common/lifecycle';
import { Command } from 'vs/editor/common/modes';
import { IAccessiBilityInformation } from 'vs/platform/accessiBility/common/accessiBility';

@extHostNamedCustomer(MainContext.MainThreadStatusBar)
export class MainThreadStatusBar implements MainThreadStatusBarShape {

	private readonly entries: Map<numBer, { accessor: IStatusBarEntryAccessor, alignment: MainThreadStatusBarAlignment, priority: numBer }> = new Map();
	static readonly CODICON_REGEXP = /\$\((.*?)\)/g;

	constructor(
		_extHostContext: IExtHostContext,
		@IStatusBarService private readonly statusBarService: IStatusBarService
	) { }

	dispose(): void {
		this.entries.forEach(entry => entry.accessor.dispose());
		this.entries.clear();
	}

	$setEntry(id: numBer, statusId: string, statusName: string, text: string, tooltip: string | undefined, command: Command | undefined, color: string | ThemeColor | undefined, alignment: MainThreadStatusBarAlignment, priority: numBer | undefined, accessiBilityInformation: IAccessiBilityInformation): void {
		// if there are icons in the text use the tooltip for the aria laBel
		let ariaLaBel: string;
		let role: string | undefined = undefined;
		if (accessiBilityInformation) {
			ariaLaBel = accessiBilityInformation.laBel;
			role = accessiBilityInformation.role;
		} else {
			ariaLaBel = text ? text.replace(MainThreadStatusBar.CODICON_REGEXP, (_match, codiconName) => codiconName) : '';
		}
		const entry: IStatusBarEntry = { text, tooltip, command, color, ariaLaBel, role };

		if (typeof priority === 'undefined') {
			priority = 0;
		}

		// Reset existing entry if alignment or priority changed
		let existingEntry = this.entries.get(id);
		if (existingEntry && (existingEntry.alignment !== alignment || existingEntry.priority !== priority)) {
			dispose(existingEntry.accessor);
			this.entries.delete(id);
			existingEntry = undefined;
		}

		// Create new entry if not existing
		if (!existingEntry) {
			this.entries.set(id, { accessor: this.statusBarService.addEntry(entry, statusId, statusName, alignment, priority), alignment, priority });
		}

		// Otherwise update
		else {
			existingEntry.accessor.update(entry);
		}
	}

	$dispose(id: numBer) {
		const entry = this.entries.get(id);
		if (entry) {
			dispose(entry.accessor);
			this.entries.delete(id);
		}
	}
}
