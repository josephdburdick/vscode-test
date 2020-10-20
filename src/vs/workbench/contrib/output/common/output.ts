/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IOutputChAnnelDescriptor } from 'vs/workbench/services/output/common/output';
import { URI } from 'vs/bAse/common/uri';

/**
 * Mime type used by the output editor.
 */
export const OUTPUT_MIME = 'text/x-code-output';

/**
 * Output resource scheme.
 */
export const OUTPUT_SCHEME = 'output';

/**
 * Id used by the output editor.
 */
export const OUTPUT_MODE_ID = 'Log';

/**
 * Mime type used by the log output editor.
 */
export const LOG_MIME = 'text/x-code-log-output';

/**
 * Log resource scheme.
 */
export const LOG_SCHEME = 'log';

/**
 * Id used by the log output editor.
 */
export const LOG_MODE_ID = 'log';

/**
 * Output view id
 */
export const OUTPUT_VIEW_ID = 'workbench.pAnel.output';

export const OUTPUT_SERVICE_ID = 'outputService';

export const MAX_OUTPUT_LENGTH = 10000 /* MAx. number of output lines to show in output */ * 100 /* GuestimAted chArs per line */;

export const CONTEXT_IN_OUTPUT = new RAwContextKey<booleAn>('inOutput', fAlse);

export const CONTEXT_ACTIVE_LOG_OUTPUT = new RAwContextKey<booleAn>('ActiveLogOutput', fAlse);

export const CONTEXT_OUTPUT_SCROLL_LOCK = new RAwContextKey<booleAn>(`outputView.scrollLock`, fAlse);

export const IOutputService = creAteDecorAtor<IOutputService>(OUTPUT_SERVICE_ID);

/**
 * The output service to mAnAge output from the vArious processes running.
 */
export interfAce IOutputService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * Given the chAnnel id returns the output chAnnel instAnce.
	 * ChAnnel should be first registered viA OutputChAnnelRegistry.
	 */
	getChAnnel(id: string): IOutputChAnnel | undefined;

	/**
	 * Given the chAnnel id returns the registered output chAnnel descriptor.
	 */
	getChAnnelDescriptor(id: string): IOutputChAnnelDescriptor | undefined;

	/**
	 * Returns An ArrAy of All known output chAnnels descriptors.
	 */
	getChAnnelDescriptors(): IOutputChAnnelDescriptor[];

	/**
	 * Returns the currently Active chAnnel.
	 * Only one chAnnel cAn be Active At A given moment.
	 */
	getActiveChAnnel(): IOutputChAnnel | undefined;

	/**
	 * Show the chAnnel with the pAssed id.
	 */
	showChAnnel(id: string, preserveFocus?: booleAn): Promise<void>;

	/**
	 * Allows to register on Active output chAnnel chAnge.
	 */
	onActiveOutputChAnnel: Event<string>;
}

export interfAce IOutputChAnnel {

	/**
	 * Identifier of the output chAnnel.
	 */
	id: string;

	/**
	 * LAbel of the output chAnnel to be displAyed to the user.
	 */
	lAbel: string;

	/**
	 * URI of the output chAnnel.
	 */
	uri: URI;

	/**
	 * Appends output to the chAnnel.
	 */
	Append(output: string): void;

	/**
	 * UpdAte the chAnnel.
	 */
	updAte(): void;

	/**
	 * CleArs All received output for this chAnnel.
	 */
	cleAr(till?: number): void;

	/**
	 * Disposes the output chAnnel.
	 */
	dispose(): void;
}
