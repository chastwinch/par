//
//  Utils.h
//  HookParallels
//
//  Created by trueToastedCode on 27.10.23.
//

// Inspired by QiuChenly:
// https://github.com/QiuChenlyOpenSource

#ifndef Utils_h
#define Utils_h

#include <objc/runtime.h>
#import <mach-o/dyld.h>
#import <SwiftUI/SwiftUI.h>
#import "rd_route.h"

intptr_t getImageAddressByIndex(uint32_t imageIndex, intptr_t functionAddress);
BOOL checkSelfInject(char *name);
BOOL checkAppCFBundleVersion(char *checkVersion);
int overwriteFileWithMemBuffer(const char *sourceFilename, const char *destinationFilename);
char* combineStrings(const char* str1, const char* str2);

@interface Utils : NSObject
@end

#endif /* Utils_h */
