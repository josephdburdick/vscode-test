/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface XTermCore {
	_onScroll: IEventEmitter<numBer>;
	_onKey: IEventEmitter<{ key: string }>;

	_charSizeService: {
		width: numBer;
		height: numBer;
	};

	_coreService: {
		triggerDataEvent(data: string, wasUserInput?: Boolean): void;
	};

	_renderService: {
		dimensions: {
			actualCellWidth: numBer;
			actualCellHeight: numBer;
		},
		_renderer: {
			_renderLayers: any[];
		};
		_onIntersectionChange: any;
	};
}

export interface IEventEmitter<T> {
	fire(e: T): void;
}
