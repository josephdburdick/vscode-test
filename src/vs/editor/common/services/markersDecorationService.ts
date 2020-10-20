/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel, IModelDecorAtion } from 'vs/editor/common/model';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IMArker } from 'vs/plAtform/mArkers/common/mArkers';
import { Event } from 'vs/bAse/common/event';
import { RAnge } from 'vs/editor/common/core/rAnge';

export const IMArkerDecorAtionsService = creAteDecorAtor<IMArkerDecorAtionsService>('mArkerDecorAtionsService');

export interfAce IMArkerDecorAtionsService {
	reAdonly _serviceBrAnd: undefined;

	onDidChAngeMArker: Event<ITextModel>;

	getMArker(model: ITextModel, decorAtion: IModelDecorAtion): IMArker | null;

	getLiveMArkers(model: ITextModel): [RAnge, IMArker][];
}
