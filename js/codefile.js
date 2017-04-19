    /*global variables*/
    var token;
    var bookmark = '';
    var LASTSYNCBOOKMARK;
    var isPaused = false;
    var countData = 0;
    var totalNumberOfContacts = 0;
    var myData;
    var contacts = [];
    var generalFunctions = {};
    var loginFunctions = {};
    var syncFunctions = {};
    var localDataFunctions = {};
    /*global variables*/

    $(document).ready(function() {
        generalFunctions.calculateContainer();
    })

  /*------------------------------------------------------------------------------------------------------------------------------
    
    General Functions 
    
    ------------------------------------------------------------------------------------------------------------------------------*/
    
    //function that calculates the height of the window so as to make the application to be responsive between screens
    generalFunctions.getHeight = function() {
        var containerHeight = windowHeight * 0.95;
        return containerHeight;
    }


    //function that calculates the internal window where the processes are being shown
    generalFunctions.calculateContainer = function() {
        windowHeight = $(window).height();
        var contHeight = generalFunctions.getHeight();
        $('.main-container').css({
            'height': contHeight,
            'margin-top': (windowHeight - contHeight) / 2
        });
        $('.footerOptions').css('width', $('.main-container').width());

    }

    //make the app responsive depending on window size
    window.addEventListener("resize", myFunc);

    function myFunc() {
        generalFunctions.calculateContainer();
    }

    //function that checks the network situation 
    generalFunctions.checkNetwork = function(myFunction, param) {
            if (!navigator.onLine) {
                if (typeof myFunction !== "undefined") {
                    alert('Check your network!');
                }
                return false;
            } else {
                if (typeof myFunction !== "undefined") {
                    myFunction(param);
                } else {
                    return true;
                }
            }
        }
    //function that creates the progress bar shown on the main page based on the percentages covered while syncing
    generalFunctions.createProgressBar = function() {
        var percentage = ((countData * 100) / totalNumberOfContacts).toFixed(2);
        $('.progress-bar').attr('aria-valuenow', percentage);
        $('.progress-bar').css('width', percentage + '%');
        $('.progress-bar').text(percentage + '%');

    }
    
    
    /*------------------------------------------------------------------------------------------------------------------------------
    
    Login Functions 
    
    ------------------------------------------------------------------------------------------------------------------------------*/

    
    
    loginFunctions.login = function(){
        var usn = $("#username").val();
        var pass = $("#pwd").val();

        $.ajax({
            url: "",
            type: "POST",
            data: {},
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                //data - response from server
                $('#loginPage').addClass('hidden');
                $('#progressPage').removeClass('hidden');
                token = data.Token;
                loginFunctions.getTotalContacts();
            },
            error: function(jqXHR, textStatus, errorThrown) {

                //error callback to inform the user regarding the wrong inputs
                $('.msg').text('Wrong username/password!');
            }
        });
    }
  

    //get approximate number of contacts
    

    loginFunctions.getTotalContacts = function() {
        $.ajax({
            url: "",
            type: "GET",
            headers: {
                'X-ORCA-Token': token
            },
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                totalNumberOfContacts = data;
                syncFunctions.getApplicationsStates(localStorage.getItem('state'));

            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert('Something went wrong please try again later');
            }
        });
    }


    /*------------------------------------------------------------------------------------------------------------------------------
    
    Sync Functions 
    
    ------------------------------------------------------------------------------------------------------------------------------*/

    
    syncFunctions.sync = function(bookmark) {
        isPaused = false;
        $.ajax({
            url: "http://mail.dreamtech.gr:36777/DREAMTECH.ORCA/Mobile/Account/Sync?bookmark=" + bookmark + "&maxCount=200",
            type: "GET",
            headers: {
                'X-ORCA-Token': token
            },
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                //data - response from server
                myData = data;
                if (localStorage.getItem('insertedData') == totalNumberOfContacts) {
                    countData = 0;
                    $('#details').addClass('hidden');
                    $('#clear').addClass('hidden');
                    generalFunctions.createProgressBar();
                }
                if (!isPaused) {
                    if (data.Accounts.length !== 0) {
                        //recursive so as to take every time the next bookmark
                        //it finishes when there arent any other accounts to fetch
                        bookmark = myData.Bookmark;
                        $('#start').addClass('hidden');
                        $('#stop').removeClass('hidden');
                        $('#details').removeClass('hidden');


                        $('.progress').text(countData + '/' + totalNumberOfContacts);
                        LASTSYNCBOOKMARK = bookmark;
                        for (var i = 0; i < data.Accounts.length; i++) {
                            if (localDataFunctions.findDifferential(data.Accounts[i].ID)) {
                                localStorage.removeItem(data.Accounts[i].ID);
                            }
                            generalFunctions.createProgressBar();
                            localDataFunctions.saveToLocal(data.Accounts[i].ID, data.Accounts[i].Name);
                        }

                        //remember current point
                        localDataFunctions.saveToLocal('point', LASTSYNCBOOKMARK);
                        localDataFunctions.saveToLocal('state', 'running');
                        countData = countData + 200;
                        localDataFunctions.saveToLocal('insertedData', countData);
                        syncFunctions.sync(bookmark);
                    } else {
                        var d = new Date();
                        var lastSync = d.toLocaleString();
                        isPaused = true;
                        LASTSYNCBOOKMARK = myData.Bookmark;
                        localDataFunctions.saveToLocal('point', LASTSYNCBOOKMARK);
                        localDataFunctions.saveToLocal('last-sync', lastSync);
                        localDataFunctions.saveToLocal('insertedData', totalNumberOfContacts);
                        localDataFunctions.saveToLocal('state', 'done');
                        $('#stop').addClass('hidden');
                        $('#start').removeClass('hidden');
                        $('#clear').removeClass('hidden');
                        $('#details').addClass('hidden');
                        countData = totalNumberOfContacts;
                        generalFunctions.createProgressBar();
                        $('.progress').text('Your offline Address Book contains ' + countData + ' contacts. Last Sync: ' + lastSync);
                    }
                } else {
                    LASTSYNCBOOKMARK = myData.Bookmark;
                    localDataFunctions.saveToLocal('state', 'stopped');
                    localDataFunctions.saveToLocal('point', LASTSYNCBOOKMARK);
                    //remember last status
                    localDataFunctions.saveToLocal('status', isPaused);
                }


            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert('something went wrong please try again later');
                $('#loginPage').removeClass('hidden');
                $('#progressPage').addClass('hidden');
                $('#stop').addClass('hidden');
                $('#start').removeClass('hidden');
                $('#details').addClass('hidden');
                localDataFunctions.clearLocalData();
                //var errorData = $.parseJSON(xhr.responseText);

            }
        });
    }


    //function that pauses the process
    syncFunctions.pauseSync = function() {

        $('#stop').addClass('hidden');
        $('#resume').removeClass('hidden');

        isPaused = true;
    }

    //function that resumes the process from the last bookmark point
    syncFunctions.resumeSync = function() {
        syncFunctions.sync(localStorage.getItem('point'));
        $('#stop').removeClass('hidden');
        $('#resume').addClass('hidden');
        $('#start').addClass('hidden');

    }
    
    //function that checks the application's state during the initialization so as to start again from the last point the user was.
    syncFunctions.getApplicationsStates = function(state) {
        localDataFunctions.determineInitialState();

        switch (state) {
            case 'initial':
                countData = 0;
                $('#clear').addClass('hidden');
            case 'running':
                countData = parseInt(localStorage.getItem('insertedData'));
                $('#stop').removeClass('hidden');
                $('#details').removeClass('hidden');
                $('#resume').addClass('hidden');
                $('#start').addClass('hidden');
                syncFunctions.sync(localStorage.getItem('point'));
                $('.progress').text(countData + '/' + totalNumberOfContacts);
                break;
            case 'stopped':
                //do something
                $('#resume').removeClass('hidden');
                $('#details').removeClass('hidden');
                $('#stop').addClass('hidden');
                countData = parseInt(localStorage.getItem('insertedData'));
                $('.progress').text(countData + '/' + totalNumberOfContacts);
                break;
            case 'done':
                $('#start').removeClass('hidden');
                $('#clear').removeClass('hidden');
                $('#details').addClass('hidden');
                countData = totalNumberOfContacts;
                $('.progress').text('Your offline Address Book contains ' + countData + ' contacts. Last sync: ' + localStorage.getItem('last-sync'));
                //do something
                break;
        }
        generalFunctions.createProgressBar();

    }

    
    /*------------------------------------------------------------------------------------------------------------------------------
    
    local data Functions 
    
    ------------------------------------------------------------------------------------------------------------------------------*/
    //localstorage save
    localDataFunctions.saveToLocal = function(id, name) {

        if (typeof(Storage) !== "undefined") {
            // Store
            localStorage.setItem(id.toString(), name);
        } else {
            alert("Sorry, your browser does not support Web Storage...");
        }
    }

    //clear offline data
    localDataFunctions.clearLocalData = function() {
        countData = 0;
        generalFunctions.createProgressBar();
        $('#clear').addClass('hidden');
        $('.progress').text('Your offline Address Book is blank.');
        localStorage.clear();
    }


    


    //function that checks whether or not an id exists inside the localstorage
     localDataFunctions.findDifferential = function(key) {
        if (key in localStorage) {
            return true;
        } else {
            return false;
        }
    }

     
    localDataFunctions.determineInitialState = function() {
        if (localStorage.getItem('insertedData') == null) {
            $('.progress').text('Your offline Address Book is blank');
            localDataFunctions.saveToLocal('state', 'initial');
            $('#start').removeClass('hidden');
        }
    }
    
    localDataFunctions.showSavedAccounts = function(){
        $('.modal-body').empty();
        var extraKeys=['point','last-sync','state','insertedData','status','key','getItem','setItem','removeItem','clear','length'];
        for(key in localStorage){
            if(extraKeys.indexOf(key) == -1){
                $('.modal-body').append('<p>'+key+' - '+localStorage.getItem(key)+'</p>');
            }
        }
    }

    
