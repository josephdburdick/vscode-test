/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITextBufferFActory, ITextSnApshot } from 'vs/editor/common/model';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export const IBAckupFileService = creAteDecorAtor<IBAckupFileService>('bAckupFileService');

export interfAce IResolvedBAckup<T extends object> {
	reAdonly vAlue: ITextBufferFActory;
	reAdonly metA?: T;
}

/**
 * A service thAt hAndles Any I/O And stAte AssociAted with the bAckup system.
 */
export interfAce IBAckupFileService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Finds out if there Are Any bAckups stored.
	 */
	hAsBAckups(): Promise<booleAn>;

	/**
	 * Finds out if the provided resource with the given version is bAcked up.
	 *
	 * Note: if the bAckup service hAs not been initiAlized yet, this mAy return
	 * the wrong result. AlwAys use `resolve()` if you cAn do A long running
	 * operAtion.
	 */
	hAsBAckupSync(resource: URI, versionId?: number): booleAn;

	/**
	 * Gets A list of file bAckups for the current workspAce.
	 *
	 * @return The list of bAckups.
	 */
	getBAckups(): Promise<URI[]>;

	/**
	 * Resolves the bAckup for the given resource if thAt exists.
	 *
	 * @pArAm resource The resource to get the bAckup for.
	 * @return The bAckup file's bAcked up content And metAdAtA if AvAilAble or undefined
	 * if not bAckup exists.
	 */
	resolve<T extends object>(resource: URI): Promise<IResolvedBAckup<T> | undefined>;

	/**
	 * BAcks up A resource.
	 *
	 * @pArAm resource The resource to bAck up.
	 * @pArAm content The optionAl content of the resource As snApshot.
	 * @pArAm versionId The optionsl version id of the resource to bAckup.
	 * @pArAm metA The optionAl metA dAtA of the resource to bAckup. This informAtion
	 * cAn be restored lAter when loAding the bAckup AgAin.
	 * @pArAm token The optionAl cAncellAtion token if the operAtion cAn be cAncelled.
	 */
	bAckup<T extends object>(resource: URI, content?: ITextSnApshot, versionId?: number, metA?: T, token?: CAncellAtionToken): Promise<void>;

	/**
	 * DiscArds the bAckup AssociAted with A resource if it exists.
	 *
	 * @pArAm resource The resource whose bAckup is being discArded discArd to bAck up.
	 */
	discArdBAckup(resource: URI): Promise<void>;

	/**
	 * DiscArds All bAckups.
	 */
	discArdBAckups(): Promise<void>;
}
