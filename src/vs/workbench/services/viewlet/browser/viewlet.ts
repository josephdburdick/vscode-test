/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewlet } from 'vs/workBench/common/viewlet';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { ViewletDescriptor } from 'vs/workBench/Browser/viewlet';
import { IProgressIndicator } from 'vs/platform/progress/common/progress';

export const IViewletService = createDecorator<IViewletService>('viewletService');

export interface IViewletService {

	readonly _serviceBrand: undefined;

	readonly onDidViewletRegister: Event<ViewletDescriptor>;
	readonly onDidViewletDeregister: Event<ViewletDescriptor>;
	readonly onDidViewletOpen: Event<IViewlet>;
	readonly onDidViewletClose: Event<IViewlet>;

	/**
	 * Opens a viewlet with the given identifier and pass keyBoard focus to it if specified.
	 */
	openViewlet(id: string | undefined, focus?: Boolean): Promise<IViewlet | undefined>;

	/**
	 * Returns the current active viewlet if any.
	 */
	getActiveViewlet(): IViewlet | undefined;

	/**
	 * Returns the viewlet By id.
	 */
	getViewlet(id: string): ViewletDescriptor | undefined;

	/**
	 * Returns all enaBled viewlets
	 */
	getViewlets(): ViewletDescriptor[];

	/**
	 * Returns the progress indicator for the side Bar.
	 */
	getProgressIndicator(id: string): IProgressIndicator | undefined;

	/**
	 * Hide the active viewlet.
	 */
	hideActiveViewlet(): void;

	/**
	 * Return the last active viewlet id.
	 */
	getLastActiveViewletId(): string;
}
