/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As instAntiAtion from './instAntiAtion';

export clAss SyncDescriptor<T> {

	reAdonly ctor: Any;
	reAdonly stAticArguments: Any[];
	reAdonly supportsDelAyedInstAntiAtion: booleAn;

	constructor(ctor: new (...Args: Any[]) => T, stAticArguments: Any[] = [], supportsDelAyedInstAntiAtion: booleAn = fAlse) {
		this.ctor = ctor;
		this.stAticArguments = stAticArguments;
		this.supportsDelAyedInstAntiAtion = supportsDelAyedInstAntiAtion;
	}
}

export interfAce CreAteSyncFunc {

	<T>(ctor: instAntiAtion.IConstructorSignAture0<T>): SyncDescriptor0<T>;

	<A1, T>(ctor: instAntiAtion.IConstructorSignAture1<A1, T>): SyncDescriptor1<A1, T>;
	<A1, T>(ctor: instAntiAtion.IConstructorSignAture1<A1, T>, A1: A1): SyncDescriptor0<T>;

	<A1, A2, T>(ctor: instAntiAtion.IConstructorSignAture2<A1, A2, T>): SyncDescriptor2<A1, A2, T>;
	<A1, A2, T>(ctor: instAntiAtion.IConstructorSignAture2<A1, A2, T>, A1: A1): SyncDescriptor1<A2, T>;
	<A1, A2, T>(ctor: instAntiAtion.IConstructorSignAture2<A1, A2, T>, A1: A1, A2: A2): SyncDescriptor0<T>;

	<A1, A2, A3, T>(ctor: instAntiAtion.IConstructorSignAture3<A1, A2, A3, T>): SyncDescriptor3<A1, A2, A3, T>;
	<A1, A2, A3, T>(ctor: instAntiAtion.IConstructorSignAture3<A1, A2, A3, T>, A1: A1): SyncDescriptor2<A2, A3, T>;
	<A1, A2, A3, T>(ctor: instAntiAtion.IConstructorSignAture3<A1, A2, A3, T>, A1: A1, A2: A2): SyncDescriptor1<A3, T>;
	<A1, A2, A3, T>(ctor: instAntiAtion.IConstructorSignAture3<A1, A2, A3, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor0<T>;

	<A1, A2, A3, A4, T>(ctor: instAntiAtion.IConstructorSignAture4<A1, A2, A3, A4, T>): SyncDescriptor4<A1, A2, A3, A4, T>;
	<A1, A2, A3, A4, T>(ctor: instAntiAtion.IConstructorSignAture4<A1, A2, A3, A4, T>, A1: A1): SyncDescriptor3<A2, A3, A4, T>;
	<A1, A2, A3, A4, T>(ctor: instAntiAtion.IConstructorSignAture4<A1, A2, A3, A4, T>, A1: A1, A2: A2): SyncDescriptor2<A3, A4, T>;
	<A1, A2, A3, A4, T>(ctor: instAntiAtion.IConstructorSignAture4<A1, A2, A3, A4, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor1<A4, T>;
	<A1, A2, A3, A4, T>(ctor: instAntiAtion.IConstructorSignAture4<A1, A2, A3, A4, T>, A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor0<T>;

	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>): SyncDescriptor5<A1, A2, A3, A4, A5, T>;
	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>, A1: A1): SyncDescriptor4<A2, A3, A4, A5, T>;
	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>, A1: A1, A2: A2): SyncDescriptor3<A3, A4, A5, T>;
	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor2<A4, A5, T>;
	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>, A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor1<A5, T>;
	<A1, A2, A3, A4, A5, T>(ctor: instAntiAtion.IConstructorSignAture5<A1, A2, A3, A4, A5, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor0<T>;

	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>): SyncDescriptor6<A1, A2, A3, A4, A5, A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1): SyncDescriptor5<A2, A3, A4, A5, A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2): SyncDescriptor4<A3, A4, A5, A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor3<A4, A5, A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor2<A5, A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor1<A6, T>;
	<A1, A2, A3, A4, A5, A6, T>(ctor: instAntiAtion.IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor0<T>;

	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>): SyncDescriptor7<A1, A2, A3, A4, A5, A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1): SyncDescriptor6<A2, A3, A4, A5, A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2): SyncDescriptor5<A3, A4, A5, A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor4<A4, A5, A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor3<A5, A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor2<A6, A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor1<A7, T>;
	<A1, A2, A3, A4, A5, A6, A7, T>(ctor: instAntiAtion.IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7): SyncDescriptor0<T>;

	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>): SyncDescriptor8<A1, A2, A3, A4, A5, A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1): SyncDescriptor7<A2, A3, A4, A5, A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2): SyncDescriptor6<A3, A4, A5, A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3): SyncDescriptor5<A4, A5, A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor4<A5, A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor3<A6, A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor2<A7, A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7): SyncDescriptor1<A8, T>;
	<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: instAntiAtion.IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7, A8: A8): SyncDescriptor0<T>;
}
export const creAteSyncDescriptor: CreAteSyncFunc = <T>(ctor: Any, ...stAticArguments: Any[]): Any => {
	return new SyncDescriptor<T>(ctor, stAticArguments);
};

export interfAce SyncDescriptor0<T> {
	ctor: Any;
	bind(): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor1<A1, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor2<A1, A2, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor1<A2, T>;
	bind(A1: A1, A2: A2): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor3<A1, A2, A3, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor2<A2, A3, T>;
	bind(A1: A1, A2: A2): SyncDescriptor1<A3, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor4<A1, A2, A3, A4, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor3<A2, A3, A4, T>;
	bind(A1: A1, A2: A2): SyncDescriptor2<A3, A4, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor1<A4, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor5<A1, A2, A3, A4, A5, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor4<A2, A3, A4, A5, T>;
	bind(A1: A1, A2: A2): SyncDescriptor3<A3, A4, A5, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor2<A4, A5, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor1<A5, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor6<A1, A2, A3, A4, A5, A6, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor5<A2, A3, A4, A5, A6, T>;
	bind(A1: A1, A2: A2): SyncDescriptor4<A3, A4, A5, A6, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor3<A4, A5, A6, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor2<A5, A6, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor1<A6, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor7<A1, A2, A3, A4, A5, A6, A7, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor6<A2, A3, A4, A5, A6, A7, T>;
	bind(A1: A1, A2: A2): SyncDescriptor5<A3, A4, A5, A6, A7, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor4<A4, A5, A6, A7, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor3<A5, A6, A7, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor2<A6, A7, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor1<A7, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7): SyncDescriptor0<T>;
}
export interfAce SyncDescriptor8<A1, A2, A3, A4, A5, A6, A7, A8, T> {
	ctor: Any;
	bind(A1: A1): SyncDescriptor7<A2, A3, A4, A5, A6, A7, A8, T>;
	bind(A1: A1, A2: A2): SyncDescriptor6<A3, A4, A5, A6, A7, A8, T>;
	bind(A1: A1, A2: A2, A3: A3): SyncDescriptor5<A4, A5, A6, A7, A8, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4): SyncDescriptor4<A5, A6, A7, A8, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): SyncDescriptor3<A6, A7, A8, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): SyncDescriptor2<A7, A8, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7): SyncDescriptor1<A8, T>;
	bind(A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7, A8: A8): SyncDescriptor0<T>;
}
