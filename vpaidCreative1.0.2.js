var debugVpaid = (function () {
  try {
    return window.top.localStorage.getItem("oaplayervpaiddebug") === "true";
  } catch (e) {
    return false;
  }
})();
var scaleAd = true;
var slotSize = [];
debugVpaid && console.log("[VPAID] Script loaded");
document.body.style.opacity = 0;

var VPAIDCreative = function () {
  debugVpaid && console.log("[VPAID] Constructor called");
  this.slot_ = null;
  this.videoSlot_ = null;
  this.callbacks_ = {};
  this.remainingTime_ = 15;
  this.adDuration_ = 15;
  this.timer_ = null;
  this.skipButton_ = null;
  this.skipDelay_ = 5;
  this.textSkip_ = "Skip";
  this.textSkipIn_ = "Skip in [number]s";
  this.thumbnailSrc_ = "";
  this.isMobile_ = false;
};

VPAIDCreative.prototype.handshakeVersion = function (version) {
  debugVpaid && console.log("[VPAID] handshakeVersion called with:", version);
  return "2.0";
};

VPAIDCreative.prototype.initAd = function (width, height, viewMode, desiredBitrate, creativeData, environmentVars) {
  debugVpaid &&
    console.log("[VPAID] initAd called:", { width, height, viewMode, desiredBitrate, creativeData, environmentVars });

  try {
    this.slot_ = environmentVars.slot;
    this.slot_.style.width = "";

    // Parse parameters
    var params = {};
    try {
      debugVpaid && console.log("[VPAID] AdParameters:", creativeData.AdParameters);
      params = JSON.parse(creativeData.AdParameters || "{}");
      debugVpaid && console.log("[VPAID] Parsed parameters:", params);
    } catch (e) {
      console.error("[VPAID] Failed to parse AdParameters:", e);
    }

    // Apply dynamic config from AdParameters
    this.adDuration_ = params.adDuration || 15;
    this.remainingTime_ = this.adDuration_;
    this.skipDelay_ = params.skipDelay || 5;
    this.textSkip_ = params.textSkip || "Skip";
    this.textSkipIn_ = params.textSkipIn || "Skip in [number]s";
    this.thumbnailSrc_ = params.thumbnailSrc || "";
    this.isMobile_ = params.isMobile || false;

    if (this.thumbnailSrc_) {
      document.body.style.backgroundImage = "url(" + this.thumbnailSrc_ + ")";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    }

    debugVpaid && console.log("[VPAID] Slot element:", this.slot_);
    debugVpaid && console.log("[VPAID] Video slot element:", this.videoSlot_);

    // Create container
    var container = document.createElement("div");
    container.id = "dfp-container-" + Date.now();
    container.style.cssText =
      "width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;backdrop-filter: blur(12px);-webkit-backdrop-filter: blur(12px);transform:translateZ(0);will-change:transform;isolation:isolate;contain: layout style;";
    container.innerHTML = '<div style="color:white;font-size:20px">Loading DFP Ad...</div>';

    this.slot_.innerHTML = "";
    this.slot_?.appendChild(container);
    debugVpaid && console.log("[VPAID] Container created:", container.id);

    // Fire AdLoaded immediately to prevent IMA errors
    var self = this;
    setTimeout(function () {
      debugVpaid && console.log("[VPAID] Firing AdLoaded");
      self.fireEvent_("AdLoaded");

      // Then load DFP
      self.loadDFP_(params, container);
    }, 100);
  } catch (e) {
    console.error("[VPAID] initAd error:", e);
    this.fireEvent_("AdError", e.message);
  }
};

VPAIDCreative.prototype.updateShieldSize = function () {
  setTimeout(
    function () {
      if (!this.skipButton_) return;
      // Get button dimensions and position
      var buttonRect = this.skipButton_.getBoundingClientRect();

      // Calculate shield size (button size + 15px)
      var shieldWidth = buttonRect.width + 15;
      var shieldHeight = buttonRect.height + 15;

      // Apply to shield
      this.clickShield_.style.right = "0px";
      this.clickShield_.style.bottom = "5%";
      this.clickShield_.style.width = "calc(" + shieldWidth + "px + 2%)";
      this.clickShield_.style.height = "calc(" + shieldHeight + "px + 5%)";
    }.bind(this),
    400,
  );
};

VPAIDCreative.prototype.createSkipButton_ = function () {
  var self = this;

  this.clickShield_ = document.createElement("div");
  this.clickShield_.id = "vpaid-click-shield";
  this.clickShield_.style.cssText =
    "position: absolute;background-color: transparent;z-index: 999;pointer-events: auto;";
  this.clickShield_.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  this.skipButton_ = document.createElement("button");
  this.skipButton_.id = "vpaid-skip-button";
  this.skipButton_.style.cssText = this.isMobile_
    ? "position: absolute; bottom: 10%; right: 0; padding: 12px 26px; background-color: rgba(0, 0, 0, 0.85); color: white; border: 1px solid rgba(255, 255, 255, 0.5); border-right: none; border-radius: 6px 0 0 6px; font-size: 26px; cursor: not-allowed; z-index: 1000; transition: background-color 0.2s ease, border-color 0.2s ease; font-family: Roboto, Arial, sans-serif; display: flex; align-items: center; justify-content: center; gap: 2px; font-weight: 500; box-sizing: border-box; white-space: nowrap; min-height: 65px;"
    : "position: absolute; bottom: 10%; right: 0; padding: 8px 20px; background-color: rgba(0, 0, 0, 0.85); color: white; border: 1px solid rgba(255, 255, 255, 0.5); border-right: none; border-radius: 6px 0 0 6px; font-size: 20px; cursor: not-allowed; z-index: 1000; transition: background-color 0.2s ease, border-color 0.2s ease; font-family: Roboto, Arial, sans-serif; display: flex; align-items: center; justify-content: center; gap: 2px; font-weight: 500; box-sizing: border-box; white-space: nowrap; min-height: 48px";

  this.skipButton_.addEventListener("mouseenter", function () {
    if (!self.skipButton_.disabled) {
      self.skipButton_.style.borderColor = "white";
    }
  });
  this.skipButton_.addEventListener("mouseleave", function () {
    self.skipButton_.style.borderColor = "rgba(255, 255, 255, 0.5)";
  });

  this.updateSkipButtonText_(this.skipDelay_);

  this.skipButton_.onclick = function () {
    if (!self.skipButton_.disabled) {
      debugVpaid && console.log("[VPAID] Skip button clicked");
      self.skipAd();
    }
  };

  this.skipButton_.disabled = true;

  if (this.slot_ && this.slot_.firstChild) {
    this.slot_.firstChild?.appendChild(this.clickShield_);
    this.slot_.firstChild?.appendChild(this.skipButton_);

    this.updateShieldSize();
  }

  debugVpaid && console.log("[VPAID] Skip button created");
};

VPAIDCreative.prototype.updateSkipButtonText_ = function (secondsRemaining) {
  if (this.skipButton_) {
    var skipIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.5em" height="1.5em" fill="currentColor" style="vertical-align:middle;flex-shrink:0"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
    if (secondsRemaining > 0) {
      this.skipButton_.innerHTML = '<span>' + this.textSkipIn_.replace("[number]", secondsRemaining) + '</span>';
    } else {
      this.updateShieldSize();
      this.skipButton_.innerHTML = '<span>' + this.textSkip_ + '</span>' + skipIcon;
    }
  }
};

VPAIDCreative.prototype.enableSkipButton_ = function () {
  if (this.skipButton_) {
    this.skipButton_.disabled = false;
    this.skipButton_.style.cursor = "pointer";

    debugVpaid && console.log("[VPAID] Skip button enabled");
  }
};

VPAIDCreative.prototype.loadDFP_ = function (params, container) {
  debugVpaid && console.log("[VPAID] loadDFP_ called with params:", params);

  var self = this;

  // Create ad slot div
  var adDiv = document.createElement("div");
  adDiv.id = "dfp-slot-" + Date.now();
  adDiv.style.cssText =
    "max-height:100%;place-items:center;display:flex;z-index:-1;transform:translateZ(0);will-change:transform;isolation:isolate;contain: layout style;";

  container.innerHTML = "";
  container?.appendChild(adDiv);

  debugVpaid && console.log("[VPAID] Created ad div:", adDiv.id);

  // Check if googletag exists
  if (typeof googletag === "undefined" || !googletag.apiReady) {
    debugVpaid && console.log("[VPAID] Googletag not ready, loading GPT...");

    var script = document.createElement("script");
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.onload = function () {
      debugVpaid && console.log("[VPAID] GPT loaded");
      self.requestDFPAd_(params, adDiv.id);
    };
    script.onerror = function () {
      console.error("[VPAID] Failed to load GPT");
    };
    document.head?.appendChild(script);
  } else {
    debugVpaid && console.log("[VPAID] Googletag ready");
    this.requestDFPAd_(params, adDiv.id);
  }
};

VPAIDCreative.prototype.requestDFPAd_ = function (params, slotId) {
  debugVpaid && console.log("[VPAID] requestDFPAd_ called for slot:", slotId);

  var self = this;

  window.googletag = window.googletag || { cmd: [] };
  googletag.cmd.push(function () {
    debugVpaid && console.log("[VPAID] Inside googletag.cmd");

    try {
      // Define slot
      googletag.cmd.push(function () {
        debugVpaid && console.log("[VPAID] Set page_url to:", params.pageUrl);
        googletag.pubads().set("page_url", params.pageUrl || "");

        googletagSlot = googletag
          .defineSlot(params.adUnit, params.sizes || [[640, 480]], slotId)
          .addService(window.googletag.pubads());
        googletag.enableServices();

        googletag.display(googletagSlot);
        if (window.googletag.pubads()?.isInitialLoadDisabled()) window.googletag.pubads().refresh([googletagSlot]);
      });

      debugVpaid && console.log("[VPAID] Slot defined:", slot, params);

      // Listen for render
      googletag.pubads().addEventListener("slotRenderEnded", function (event) {
        debugVpaid && console.log("[VPAID] slotRenderEnded event:", event);

        if (event.slot === googletagSlot) {
          if (!event.isEmpty) {
            document.body.style.opacity = 1;

            debugVpaid && console.log("[VPAID] Ad rendered successfully");
            slotSize = event.size;

            // Add click handler
            var element = document.getElementById(slotId);
            debugVpaid && console.log("[VPAID] before scale");
            if (scaleAd) {
              var scaleX = parseInt(slot.style.width) / event.size[0];
              var scaleY = parseInt(slot.style.height) / event.size[1];
              var scale = Math.min(scaleX, scaleY, 1);
              element.style.transform = "perspective(1px) translateZ(0) scale(" + Math.floor(scale * 100) / 100 + ")";
              element.style.transformOrigin = "top";
              element.style.backfaceVisibility = "hidden";
              element.style.webkitFontSmoothing = "subpixel-antialiased";
            }
            debugVpaid && console.log("[VPAID] after scale");
            if (element) {
              element.style.cursor = "pointer";
              element.onclick = function () {
                debugVpaid && console.log("[VPAID] Ad clicked");
                self.fireEvent_("AdClickThru", "", "0", true);
              };
            }
          } else {
            debugVpaid && console.log("[VPAID] No ad returned");
            clearInterval(self.timer_);
            self.fireEvent_("AdError", "No ad returned");
            self.fireEvent_("AdVideoComplete");
            self.stopAd();
          }
        }
      });

      // Enable services
      debugVpaid && console.log("[VPAID] Enabling services...");
      googletag.enableServices();

      // Display ad
      debugVpaid && console.log("[VPAID] Calling display...");
      googletag.display(slot);

      // Check if refresh needed
      if (googletag.pubads().isInitialLoadDisabled()) {
        debugVpaid && console.log("[VPAID] Initial load disabled, refreshing...");
        googletag.pubads().refresh([slot]);
      }
    } catch (e) {
      console.error("[VPAID] Error in googletag.cmd:", e);
      clearInterval(self.timer_);
      self.fireEvent_("AdVideoComplete");
      self.stopAd();
    }
  });
};

VPAIDCreative.prototype.startAd = function () {
  debugVpaid && console.log("[VPAID] startAd called");

  var self = this;
  var startTime = Date.now();
  var skipCountdown = this.skipDelay_;

  this.createSkipButton_();

  // Start timer
  this.timer_ = setInterval(function () {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    self.remainingTime_ = Math.max(0, self.adDuration_ - elapsed);

    // Update skip button countdown
    if (skipCountdown > 0) {
      skipCountdown = Math.max(0, self.skipDelay_ - elapsed);
      self.updateSkipButtonText_(skipCountdown);

      // Enable skip button when countdown reaches 0
      if (skipCountdown === 0 && self.skipButton_ && self.skipButton_.disabled) {
        self.enableSkipButton_();
      }
    }

    debugVpaid &&
      console.log("[VPAID] Timer update - remaining:", self.remainingTime_, "skip countdown:", skipCountdown);

    if (self.remainingTime_ <= 0) {
      debugVpaid && console.log("[VPAID] Ad complete");
      clearInterval(self.timer_);
      self.fireEvent_("AdVideoComplete");
      self.stopAd();
    }
  }, 1000);

  this.fireEvent_("AdStarted");
  this.fireEvent_("AdImpression");
  this.fireEvent_("AdVideoStart");
};

VPAIDCreative.prototype.stopAd = function () {
  debugVpaid && console.log("[VPAID] stopAd called");

  if (this.timer_) {
    clearInterval(this.timer_);
    this.timer_ = null;
  }

  if (this.skipButton_ && this.skipButton_.parentNode) {
    this.skipButton_.parentNode.removeChild(this.skipButton_);
    this.skipButton_ = null;
  }

  if (this.slot_) {
    this.slot_.innerHTML = "";
  }

  this.fireEvent_("AdStopped");
};

// Required methods
VPAIDCreative.prototype.skipAd = function () {
  debugVpaid && console.log("[VPAID] skipAd called");

  // Fire skip event before stopping
  this.fireEvent_("AdSkipped");

  // Clear timer to prevent additional complete event
  if (this.timer_) {
    clearInterval(this.timer_);
    this.timer_ = null;
  }

  this.stopAd();
};

VPAIDCreative.prototype.resizeAd = function (width, height, viewMode) {
  debugVpaid && console.log("[VPAID] resizeAd called:", { width, height, viewMode });

  var element = document.querySelector('[id^="dfp-slot-"]');
  var slot = document.querySelector("#slot");
  if (scaleAd && element && slot) {
    var scaleX = parseInt(slot.style.width) / slotSize[0];
    var scaleY = parseInt(slot.style.height) / slotSize[1];
    var scale = Math.min(scaleX, scaleY, 1);
    element.style.transform = "perspective(1px) translateZ(0) scale(" + Math.floor(scale * 100) / 100 + ")";
    element.style.transformOrigin = "top";
    element.style.backfaceVisibility = "hidden";
    element.style.webkitFontSmoothing = "subpixel-antialiased";
  }
  this.updateShieldSize();
};

VPAIDCreative.prototype.pauseAd = function () {
  debugVpaid && console.log("[VPAID] pauseAd called");
  this.fireEvent_("AdPaused");
};

VPAIDCreative.prototype.resumeAd = function () {
  debugVpaid && console.log("[VPAID] resumeAd called");
  this.fireEvent_("AdPlaying");
};

VPAIDCreative.prototype.expandAd = function () {
  debugVpaid && console.log("[VPAID] expandAd called");
};

VPAIDCreative.prototype.collapseAd = function () {
  debugVpaid && console.log("[VPAID] collapseAd called");
};

VPAIDCreative.prototype.subscribe = function (callback, eventName) {
  debugVpaid && console.log("[VPAID] subscribe called for event:", eventName);
  this.callbacks_[eventName] = callback;
};

VPAIDCreative.prototype.unsubscribe = function (eventName) {
  debugVpaid && console.log("[VPAID] unsubscribe called for event:", eventName);
  delete this.callbacks_[eventName];
};

// Getters
VPAIDCreative.prototype.getAdLinear = function () {
  return true;
};
VPAIDCreative.prototype.getAdWidth = function () {
  return 640;
};
VPAIDCreative.prototype.getAdHeight = function () {
  return 480;
};
VPAIDCreative.prototype.getAdExpanded = function () {
  return false;
};
VPAIDCreative.prototype.getAdSkippableState = function () {
  if (this.skipButton_ && !this.skipButton_.disabled) {
    return true;
  }
  return false;
};
VPAIDCreative.prototype.getAdRemainingTime = function () {
  return this.remainingTime_;
};
VPAIDCreative.prototype.getAdDuration = function () {
  return this.adDuration_;
};
VPAIDCreative.prototype.getAdVolume = function () {
  return 1;
};
VPAIDCreative.prototype.setAdVolume = function (v) {
  debugVpaid && console.log("[VPAID] setAdVolume:", v);
};
VPAIDCreative.prototype.getAdCompanions = function () {
  return "";
};
VPAIDCreative.prototype.getAdIcons = function () {
  return false;
};

VPAIDCreative.prototype.fireEvent_ = function (eventName) {
  debugVpaid && console.log("[VPAID] Firing event:", eventName, arguments);
  var args = Array.prototype.slice.call(arguments, 1);
  if (this.callbacks_[eventName]) {
    this.callbacks_[eventName].apply(this, args);
  }
};

window.getVPAIDAd = function () {
  debugVpaid && console.log("[VPAID] getVPAIDAd called");
  return new VPAIDCreative();
};

debugVpaid && console.log("[VPAID] Script execution complete");
