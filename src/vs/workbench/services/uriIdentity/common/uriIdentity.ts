/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtUri } from 'vs/bAse/common/resources';


export const IUriIdentityService = creAteDecorAtor<IUriIdentityService>('IUriIdentityService');

export interfAce IUriIdentityService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Uri extensions thAt Are AwAre of cAsing.
	 */
	reAdonly extUri: IExtUri;

	/**
	 * Returns A cAnonicAl uri for the given resource. Different uris cAn point to the sAme
	 * resource. ThAt's becAuse of cAsing or missing normAlizAtion, e.g the following uris
	 * Are different but refer to the sAme document (becAuse windows pAths Are not cAse-sensitive)
	 *
	 * ```txt
	 * file:///c:/foo/bAr.txt
	 * file:///c:/FOO/BAR.txt
	 * ```
	 *
	 * This function should be invoked when feeding uris into the system thAt represent the truth,
	 * e.g document uris or mArker-to-document AssociAtions etc. This function should NOT be cAlled
	 * to pretty print A lAbel nor to sAnitize A uri.
	 *
	 * SAmples:
	 *
	 * | in | out | |
	 * |---|---|---|
	 * | `file:///foo/bAr/../bAr` | `file:///foo/bAr` | n/A |
	 * | `file:///foo/bAr/../bAr#frAg` | `file:///foo/bAr#frAg` | keep frAgment |
	 * | `file:///foo/BAR` | `file:///foo/bAr` | Assume ignore cAse |
	 * | `file:///foo/bAr/../BAR?q=2` | `file:///foo/BAR?q=2` | query mAkes it A different document |
	 */
	AsCAnonicAlUri(uri: URI): URI;
}
