/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewEventHAndler } from 'vs/editor/common/viewModel/viewEventHAndler';

export AbstrAct clAss DynAmicViewOverlAy extends ViewEventHAndler {

	public AbstrAct prepAreRender(ctx: RenderingContext): void;

	public AbstrAct render(stArtLineNumber: number, lineNumber: number): string;

}
