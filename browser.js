var browser = (function(configModule, tabsModule) {
  var dce = function(str) { return document.createElement(str); };

  var Browser = function(
    controlsContainer,
    back,
    forward,
    home,
    reload,
    locationForm,
    locationBar,
    tabContainer,
    contentContainer,
    newTabElement) {
    this.controlsContainer = controlsContainer;
    this.back = back;
    this.forward = forward;
    this.reload = reload;
    this.home = home;
    this.locationForm = locationForm;
    this.locationBar = locationBar;
    this.tabContainer = tabContainer;
    this.contentContainer = contentContainer;
    this.newTabElement = newTabElement;
    this.tabs = new tabsModule.TabList(
        'tabs',
        this,
        tabContainer,
        contentContainer,
        newTabElement);

    this.init();
  };

  Browser.prototype.init = function() {
    (function(browser) {
      window.addEventListener('resize', function(e) {
        browser.doLayout(e);
      });

      window.addEventListener('keydown', function(e) {
        browser.doKeyDown(e);
      });

      browser.back.addEventListener('click', function(e) {
        browser.tabs.getSelected().goBack();
      });

      browser.forward.addEventListener('click', function() {
        browser.tabs.getSelected().goForward();
      });

      browser.home.addEventListener('click', function() {
        browser.tabs.getSelected().navigateTo(configModule.homepage);
      });

      browser.reload.addEventListener('click', function() {
        var tab = browser.tabs.getSelected();
        if (tab.isLoading()) {
          tab.stopNavigation();
        } else {
          tab.doReload();
        }
      });
      browser.reload.addEventListener(
        'webkitAnimationIteration',
        function() {
          // Between animation iterations: If loading is done, then stop spinning
          if (!browser.tabs.getSelected().isLoading()) {
            document.body.classList.remove('loading');
          }
        }
      );

      browser.locationForm.addEventListener('submit', function(e) {
        //CHANGELOG
        //-----------------------------
        //
        //VERSION 2.3.3.5b
        //added partition line
        //
        //VERSION 2.3.3.5
        //Change from http check to . check
        //
        //VERSION 2.3.3.4
        //http sensing, no google search
        //
        e.preventDefault();
        var urlvalue = browser.locationBar.value;
        var therealurl;
        //If to check for http
        if (urlvalue.indexOf("http://") !=-1 && urlvalue.indexOf(".") !=-1) {
          therealurl = browser.locationBar.value;
          //document.getElementsByTagName("webview")[0].setAttribute("partition", "persist:all");
          browser.tabs.getSelected().navigateTo(therealurl);
        }
        else if (urlvalue.indexOf(".") !=-1){
          therealurl = "http://" + browser.locationBar.value;
          //document.getElementsByTagName("webview")[0].setAttribute("partition", "persist:all");
          browser.tabs.getSelected().navigateTo(therealurl);
        }
        
        //If to check for search
        else{
          therealurl = "https://www.google.com/search?site=&source=hp&q=" + urlvalue + "&oq=" + urlvalue + "&gs_l=hp.12..0i131l2j0l3j0i131j0j0i155i3j0l2.2438.3264.0.5360.6.6.0.0.0.0.163.575.3j2.5.0....0...1c.1.64.hp..1.4.495.0.xjqd_2g-gtk&safe=active&ssui=on";
          //document.getElementsByTagName("webview")[0].setAttribute("partition", "persist:all");
          browser.tabs.getSelected().navigateTo(therealurl);
        }
        //document.getElementsByTagName("webview")[0].setAttribute("partition", "persist:all");
        browser.tabs.getSelected().navigateTo(therealurl);
      });

      browser.newTabElement.addEventListener(
        'click',
        function(e) { return browser.doNewTab(e); });

      window.addEventListener('message', function(e) {
        if (e.data) {
          var data = JSON.parse(e.data);
          if (data.name && data.title) {
            browser.tabs.setLabelByName(data.name, data.title);
          } else {
            console.warn(
                'Warning: Expected message from guest to contain {name, title}, but got:',
                data);
          }
        } else {
          console.warn('Warning: Message from guest contains no data');
        }
      });

      var webview = dce('webview');
      //var mainwebview = webview[0].setAttribute("partition", "persist:all");
      var tab = browser.tabs.append(webview);
      // Global window.newWindowEvent may be injected by opener
      if (window.newWindowEvent) {
        window.newWindowEvent.window.attach(webview);
      } else {
        tab.navigateTo(configModule.homepage);
      }
      browser.tabs.selectTab(tab);
    }(this));
  };

  Browser.prototype.doLayout = function(e) {
    var controlsHeight = this.controlsContainer.offsetHeight;
    var windowWidth = document.documentElement.clientWidth;
    var windowHeight = document.documentElement.clientHeight;
    var contentWidth = windowWidth;
    var contentHeight = windowHeight - controlsHeight;

    var tab = this.tabs.getSelected();
    var webview = tab.getWebview();
    var webviewContainer = tab.getWebviewContainer();

    var layoutElements = [
      this.contentContainer,
      webviewContainer,
      webview];
    for (var i = 0; i < layoutElements.length; ++i) {
      layoutElements[i].style.width = contentWidth + 'px';
      layoutElements[i].style.height = contentHeight + 'px';
    }
  };

  // New window that is NOT triggered by existing window
  Browser.prototype.doNewTab = function(e) {
    var tab = this.tabs.append(dce('webview'));
    tab.navigateTo(configModule.homepage);
    this.tabs.selectTab(tab);
    return tab;
  };

  Browser.prototype.doKeyDown = function(e) {
    if (e.ctrlKey) {
      switch(e.keyCode) {
        // Ctrl+T
        case 84:
        this.doNewTab();
        break;
        // Ctrl+W
        case 87:
        e.preventDefault();
        this.tabs.removeTab(this.tabs.getSelected());
        break;
      }
      // Ctrl + [1-9]
      if (e.keyCode >= 49 && e.keyCode <= 57) {
        var idx = e.keyCode - 49;
        if (idx < this.tabs.getNumTabs()) {
          this.tabs.selectIdx(idx);
        }
      }
    }
  };

  Browser.prototype.doTabNavigating = function(tab, url) {
    if (tab.selected) {
      document.body.classList.add('loading');
      this.locationBar.value = url;
    }
  };

  Browser.prototype.doTabNavigated = function(tab, url) {
    this.updateControls();
  };

  Browser.prototype.doTabSwitch = function(oldTab, newTab) {
    this.updateControls();
  };

  Browser.prototype.updateControls = function() {
    var selectedTab = this.tabs.getSelected();
    if (selectedTab.isLoading()) {
      document.body.classList.add('loading');
    }
    var selectedWebview = selectedTab.getWebview();
    this.back.disabled = !selectedWebview.canGoBack();
    this.forward.disabled = !selectedWebview.canGoForward();
    if (this.locationBar.value != selectedTab.url) {
      this.locationBar.value = selectedTab.url;
    }
  };
  
  //document.getElementsByTagName("webview")[0].setAttribute("partition", "persist:all");
  return {'Browser': Browser};
})(config, tabs);