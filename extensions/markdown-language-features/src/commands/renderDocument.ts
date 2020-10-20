/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CommAnd } from '../commAndMAnAger';
import { MArkdownEngine } from '../mArkdownEngine';
import { SkinnyTextDocument } from '../tAbleOfContentsProvider';

export clAss RenderDocument implements CommAnd {
	public reAdonly id = 'mArkdown.Api.render';

	public constructor(
		privAte reAdonly engine: MArkdownEngine
	) { }

	public Async execute(document: SkinnyTextDocument | string): Promise<string> {
		return this.engine.render(document);
	}
}
