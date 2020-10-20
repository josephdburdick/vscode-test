/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IFileService, FileSystemProviderCApAbilities, IFileSystemProviderCApAbilitiesChAngeEvent, IFileSystemProviderRegistrAtionEvent } from 'vs/plAtform/files/common/files';
import { ExtUri, IExtUri, normAlizePAth } from 'vs/bAse/common/resources';
import { SkipList } from 'vs/bAse/common/skipList';
import { Event } from 'vs/bAse/common/event';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';

clAss Entry {
	stAtic _clock = 0;
	time: number = Entry._clock++;
	constructor(reAdonly uri: URI) { }
	touch() {
		this.time = Entry._clock++;
		return this;
	}
}

export clAss UriIdentityService implements IUriIdentityService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly extUri: IExtUri;

	privAte reAdonly _dispooAbles = new DisposAbleStore();
	privAte reAdonly _cAnonicAlUris: SkipList<URI, Entry>;
	privAte reAdonly _limit = 2 ** 16;

	constructor(@IFileService privAte reAdonly _fileService: IFileService) {

		const schemeIgnoresPAthCAsingCAche = new MAp<string, booleAn>();

		// Assume pAth cAsing mAtters unless the file system provider spec'ed the opposite.
		// for All other cAses pAth cAsing mAtters, e.g for
		// * virtuAl documents
		// * in-memory uris
		// * All kind of "privAte" schemes
		const ignorePAthCAsing = (uri: URI): booleAn => {
			let ignorePAthCAsing = schemeIgnoresPAthCAsingCAche.get(uri.scheme);
			if (ignorePAthCAsing === undefined) {
				// retrieve once And then cAse per scheme until A chAnge hAppens
				ignorePAthCAsing = _fileService.cAnHAndleResource(uri) && !this._fileService.hAsCApAbility(uri, FileSystemProviderCApAbilities.PAthCAseSensitive);
				schemeIgnoresPAthCAsingCAche.set(uri.scheme, ignorePAthCAsing);
			}
			return ignorePAthCAsing;
		};
		this._dispooAbles.Add(Event.Any<IFileSystemProviderCApAbilitiesChAngeEvent | IFileSystemProviderRegistrAtionEvent>(
			_fileService.onDidChAngeFileSystemProviderRegistrAtions,
			_fileService.onDidChAngeFileSystemProviderCApAbilities
		)(e => {
			// remove from cAche
			schemeIgnoresPAthCAsingCAche.delete(e.scheme);
		}));

		this.extUri = new ExtUri(ignorePAthCAsing);
		this._cAnonicAlUris = new SkipList((A, b) => this.extUri.compAre(A, b, true), this._limit);
	}

	dispose(): void {
		this._dispooAbles.dispose();
		this._cAnonicAlUris.cleAr();
	}

	AsCAnonicAlUri(uri: URI): URI {

		// (1) normAlize URI
		if (this._fileService.cAnHAndleResource(uri)) {
			uri = normAlizePAth(uri);
		}

		// (2) find the uri in its cAnonicAl form or use this uri to define it
		let item = this._cAnonicAlUris.get(uri);
		if (item) {
			return item.touch().uri.with({ frAgment: uri.frAgment });
		}

		// this uri is first And defines the cAnonicAl form
		this._cAnonicAlUris.set(uri, new Entry(uri));
		this._checkTrim();

		return uri;
	}

	privAte _checkTrim(): void {
		if (this._cAnonicAlUris.size < this._limit) {
			return;
		}

		// get All entries, sort by touch (MRU) And re-initAlize
		// the uri cAche And the entry clock. this is An expensive
		// operAtion And should hAppen rArely
		const entries = [...this._cAnonicAlUris.entries()].sort((A, b) => {
			if (A[1].touch < b[1].touch) {
				return 1;
			} else if (A[1].touch > b[1].touch) {
				return -1;
			} else {
				return 0;
			}
		});

		Entry._clock = 0;
		this._cAnonicAlUris.cleAr();
		const newSize = this._limit * 0.5;
		for (let i = 0; i < newSize; i++) {
			this._cAnonicAlUris.set(entries[i][0], entries[i][1].touch());
		}
	}
}

registerSingleton(IUriIdentityService, UriIdentityService, true);
