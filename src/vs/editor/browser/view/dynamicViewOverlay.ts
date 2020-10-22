/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';

export aBstract class DynamicViewOverlay extends ViewEventHandler {

	puBlic aBstract prepareRender(ctx: RenderingContext): void;

	puBlic aBstract render(startLineNumBer: numBer, lineNumBer: numBer): string;

}
