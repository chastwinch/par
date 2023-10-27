//
//  Utils.m
//  HookParallels
//
//  Created by trueToastedCode on 27.10.23.
//

// Inspired by QiuChenly:
// https://github.com/QiuChenlyOpenSource

#import <objc/runtime.h>
#import <mach-o/dyld.h>
#import <AppKit/AppKit.h>
#import "Utils.h"

@implementation Utils

intptr_t addrA = 0;

intptr_t getImageAddressByIndex(uint32_t imageIndex, intptr_t functionAddress) {
    if (imageIndex == 0) return addrA + functionAddress;
    return _dyld_get_image_vmaddr_slide(imageIndex) + functionAddress;
}

const char *myAppBundleName = "";
const char *myAppBundleVersionCode = "";
const char *myAppCFBundleVersion = "";

BOOL checkSelfInject(char *name) {
    return strcmp(myAppBundleName, name) == 0;
}

BOOL checkAppCFBundleVersion(char *checkVersion) {
    return strcmp(myAppCFBundleVersion, checkVersion) == 0;
}

int overwriteFileWithMemBuffer(const char *sourceFilename, const char *destinationFilename) {
    FILE *sourceFile, *destinationFile;

    // Open the source file for binary reading
    sourceFile = fopen(sourceFilename, "rb");
    if (sourceFile == NULL) {
        NSLog(@"[bad_utils] Error opening source file");
        return 1;
    }

    // Open the destination file for binary writing (overwriting)
    destinationFile = fopen(destinationFilename, "wb");
    if (destinationFile == NULL) {
        NSLog(@"[bad_utils] Error opening destination file");
        fclose(sourceFile);
        return 1;
    }

    // Find the size of the source file
    fseek(sourceFile, 0, SEEK_END);
    long fileSize = ftell(sourceFile);
    fseek(sourceFile, 0, SEEK_SET);

    // Allocate a buffer to hold the entire file
    unsigned char *buffer = (unsigned char *)malloc(fileSize);
    if (buffer == NULL) {
        NSLog(@"[bad_utils] Error allocating memory");
        fclose(sourceFile);
        fclose(destinationFile);
        return 1;
    }

    // Read the entire file into the buffer
    size_t bytesRead = fread(buffer, 1, fileSize, sourceFile);

    // Write the entire buffer to the destination file
    if (bytesRead == fileSize) {
        fwrite(buffer, 1, fileSize, destinationFile);
    } else {
        NSLog(@"[bad_utils] Error reading from source file");
    }

    // Close both files and free the buffer
    fclose(sourceFile);
    fclose(destinationFile);
    free(buffer);
    
    return 0;
}

char* combineStrings(const char* str1, const char* str2) {
    // Calculate the lengths of the input strings
    size_t len1 = strlen(str1);
    size_t len2 = strlen(str2);

    // Allocate memory for the combined string plus one extra byte for the null terminator
    char* combined = (char*)malloc(len1 + len2 + 1);

    if (combined == NULL) {
        NSLog(@"[bad_utils] Memory allocation failed");
        return NULL;
    }

    // Copy the first string to the combined string
    strcpy(combined, str1);

    // Concatenate the second string to the combined string
    strcat(combined, str2);

    return combined;
}

+ (void)load {
    NSBundle *app = [NSBundle mainBundle];
    NSString *appName = [app bundleIdentifier];
    NSString *appVersion = [app objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
    NSString *appCFBundleVersion = [app objectForInfoDictionaryKey:@"CFBundleVersion"];
    myAppBundleName = [appName UTF8String];
    myAppBundleVersionCode = [appVersion UTF8String];
    myAppCFBundleVersion = [appCFBundleVersion UTF8String];
    addrA = _dyld_get_image_vmaddr_slide(0);
}

@end
