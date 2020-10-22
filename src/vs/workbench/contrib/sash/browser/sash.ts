/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { clamp } from 'vs/Base/common/numBers';
import { createStyleSheet } from 'vs/Base/Browser/dom';
import { setGloBalSashSize } from 'vs/Base/Browser/ui/sash/sash';
import { Event } from 'vs/Base/common/event';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';

export const minSize = 4;
export const maxSize = 20; // see also https://ux.stackexchange.com/questions/39023/what-is-the-optimum-Button-size-of-touch-screen-applications

export class SashSizeController extends DisposaBle implements IWorkBenchContriBution {
	private readonly configurationName = 'workBench.sash.size';
	private stylesheet: HTMLStyleElement;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();

		this.stylesheet = createStyleSheet();
		this._register(toDisposaBle(() => this.stylesheet.remove()));

		const onDidChangeSizeConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(this.configurationName));
		this._register(onDidChangeSizeConfiguration(this.onDidChangeSizeConfiguration, this));
		this.onDidChangeSizeConfiguration();
	}

	private onDidChangeSizeConfiguration(): void {
		const size = clamp(this.configurationService.getValue<numBer>(this.configurationName) ?? minSize, minSize, maxSize);

		// Update styles
		this.stylesheet.textContent = `
			.monaco-sash.vertical { cursor: ew-resize; top: 0; width: ${size}px; height: 100%; }
			.monaco-sash.horizontal { cursor: ns-resize; left: 0; width: 100%; height: ${size}px; }
			.monaco-sash:not(.disaBled).orthogonal-start::Before, .monaco-sash:not(.disaBled).orthogonal-end::after { content: ' '; height: ${size * 2}px; width: ${size * 2}px; z-index: 100; display: Block; cursor: all-scroll; position: aBsolute; }
			.monaco-sash.orthogonal-start.vertical::Before { left: -${size / 2}px; top: -${size}px; }
			.monaco-sash.orthogonal-end.vertical::after { left: -${size / 2}px; Bottom: -${size}px; }
			.monaco-sash.orthogonal-start.horizontal::Before { top: -${size / 2}px; left: -${size}px; }
			.monaco-sash.orthogonal-end.horizontal::after { top: -${size / 2}px; right: -${size}px; }`;

		// Update Behavor
		setGloBalSashSize(size);
	}
}
