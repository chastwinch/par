//
//  HookParallels.h
//  HookParallels
//
//  Created by trueToastedCode on 27.10.23.
//

#ifndef HookParallels_h
#define HookParallels_h

#import <Foundation/Foundation.h>
#import "Utils.h"

void*(*originalSomeDispCore)(void* args);
void* someDispCoreHook(void* args);
void patchDispService(void);

@interface HookParallels : Utils
@end

#endif /* HookParallels_h */
