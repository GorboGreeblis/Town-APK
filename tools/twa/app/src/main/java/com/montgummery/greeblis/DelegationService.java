// Portions (c) Meta Platforms, Inc. and affiliates.
package com.montgummery.greeblis;


import com.meta.androidbrowserhelper.horizonpermissions.PermissionRequestExtraCommandHandler;

import com.meta.androidbrowserhelper.horizonplatformsdk.HorizonPlatformSdkRequestHandler;


public class DelegationService extends
        com.meta.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();

        
            registerExtraCommandHandler(new PermissionRequestExtraCommandHandler());
            registerExtraCommandHandler(new HorizonPlatformSdkRequestHandler(getApplicationContext()));
        
    }
}

