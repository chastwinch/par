//
//  HookParallels.m
//  HookParallels
//
//  Created by trueToastedCode on 27.10.23.
//

#import "HookParallels.h"

@implementation HookParallels

const char* pdfmDispDir = "/Applications/Parallels Desktop.app/Contents/MacOS/Parallels Service.app/Contents/MacOS";
char* pdfmDispDst;
char* pdfmDispDstPatch;
char* pdfmDispDstBcup;

void*(*originalSomeDispCore)(void* args) = NULL;

void* someDispCoreHook(void* args) {
    NSLog(@"[bad_prl_disp_service] Core hook called, restore Disp backup");
    
    int status = overwriteFileWithMemBuffer(pdfmDispDstBcup, pdfmDispDst);
    NSLog(@"[bad_prl_disp_service] Restored Disp backup with status %d", status);
    
    void* result = originalSomeDispCore(args);
    
    NSLog(@"[bad_prl_disp_service] Core finished, restore Disp patch");
    
    status = overwriteFileWithMemBuffer(pdfmDispDstPatch, pdfmDispDst);
    NSLog(@"[bad_prl_disp_service] Restored Disp patch with status %d", status);
    
    return result;
}
 
void patchDispService(void) {
    if (!checkAppCFBundleVersion("54729")) {
        return;
    }
    #if defined(__aarch64__)
        // hook a core function of the disp service
        intptr_t originalSomeDispCoreAddress = getImageAddressByIndex(0, 0x1001BD260);
        int r = rd_route((void *)originalSomeDispCoreAddress, someDispCoreHook, (void **)&originalSomeDispCore);
        NSLog(@"[bad_prl_disp_service] Hooked someDispCoreHook with status %d", r);
    #endif
}

+ (void)load {
    pdfmDispDst = combineStrings((char*)pdfmDispDir, "/prl_disp_service");
    pdfmDispDstPatch = combineStrings(pdfmDispDst, "_patched");
    pdfmDispDstBcup = combineStrings(pdfmDispDst, "_bcup");
    patchDispService();
}

@end
