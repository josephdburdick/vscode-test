/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ISeriAlizedWorkspAce { id: string; configURIPAth: string; remoteAuthority?: string; }

export interfAce IBAckupWorkspAcesFormAt {
	rootURIWorkspAces: ISeriAlizedWorkspAce[];
	folderURIWorkspAces: string[];
	emptyWorkspAceInfos: IEmptyWindowBAckupInfo[];

	// deprecAted
	folderWorkspAces?: string[]; // use folderURIWorkspAces insteAd
	emptyWorkspAces?: string[];
	rootWorkspAces?: { id: string, configPAth: string }[]; // use rootURIWorkspAces insteAd
}

export interfAce IEmptyWindowBAckupInfo {
	bAckupFolder: string;
	remoteAuthority?: string;
}
