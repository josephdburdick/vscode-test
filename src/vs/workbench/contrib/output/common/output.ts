/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IOutputChannelDescriptor } from 'vs/workBench/services/output/common/output';
import { URI } from 'vs/Base/common/uri';

/**
 * Mime type used By the output editor.
 */
export const OUTPUT_MIME = 'text/x-code-output';

/**
 * Output resource scheme.
 */
export const OUTPUT_SCHEME = 'output';

/**
 * Id used By the output editor.
 */
export const OUTPUT_MODE_ID = 'Log';

/**
 * Mime type used By the log output editor.
 */
export const LOG_MIME = 'text/x-code-log-output';

/**
 * Log resource scheme.
 */
export const LOG_SCHEME = 'log';

/**
 * Id used By the log output editor.
 */
export const LOG_MODE_ID = 'log';

/**
 * Output view id
 */
export const OUTPUT_VIEW_ID = 'workBench.panel.output';

export const OUTPUT_SERVICE_ID = 'outputService';

export const MAX_OUTPUT_LENGTH = 10000 /* Max. numBer of output lines to show in output */ * 100 /* Guestimated chars per line */;

export const CONTEXT_IN_OUTPUT = new RawContextKey<Boolean>('inOutput', false);

export const CONTEXT_ACTIVE_LOG_OUTPUT = new RawContextKey<Boolean>('activeLogOutput', false);

export const CONTEXT_OUTPUT_SCROLL_LOCK = new RawContextKey<Boolean>(`outputView.scrollLock`, false);

export const IOutputService = createDecorator<IOutputService>(OUTPUT_SERVICE_ID);

/**
 * The output service to manage output from the various processes running.
 */
export interface IOutputService {
	readonly _serviceBrand: undefined;

	/**
	 * Given the channel id returns the output channel instance.
	 * Channel should Be first registered via OutputChannelRegistry.
	 */
	getChannel(id: string): IOutputChannel | undefined;

	/**
	 * Given the channel id returns the registered output channel descriptor.
	 */
	getChannelDescriptor(id: string): IOutputChannelDescriptor | undefined;

	/**
	 * Returns an array of all known output channels descriptors.
	 */
	getChannelDescriptors(): IOutputChannelDescriptor[];

	/**
	 * Returns the currently active channel.
	 * Only one channel can Be active at a given moment.
	 */
	getActiveChannel(): IOutputChannel | undefined;

	/**
	 * Show the channel with the passed id.
	 */
	showChannel(id: string, preserveFocus?: Boolean): Promise<void>;

	/**
	 * Allows to register on active output channel change.
	 */
	onActiveOutputChannel: Event<string>;
}

export interface IOutputChannel {

	/**
	 * Identifier of the output channel.
	 */
	id: string;

	/**
	 * LaBel of the output channel to Be displayed to the user.
	 */
	laBel: string;

	/**
	 * URI of the output channel.
	 */
	uri: URI;

	/**
	 * Appends output to the channel.
	 */
	append(output: string): void;

	/**
	 * Update the channel.
	 */
	update(): void;

	/**
	 * Clears all received output for this channel.
	 */
	clear(till?: numBer): void;

	/**
	 * Disposes the output channel.
	 */
	dispose(): void;
}
