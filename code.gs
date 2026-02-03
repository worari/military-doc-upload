function loginUser(email, password) {
    // Input validation
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }

    // Retrieve user data from Google Sheet
    const sheet = SpreadsheetApp.openById('your_sheet_id_here').getSheetByName('Users');
    const users = sheet.getValues(); // Use getValues instead of getDisplayValues
    const user = users.find(row => row[0] === email);

    if (!user) {
        throw new Error('User not found.');
    }

    // Rate limiting: check last login attempt
    const lastLoginAttempt = user[2]; // Assuming the 3rd column is for tracking last login time
    const currentTime = new Date();
    if (lastLoginAttempt && (currentTime - new Date(lastLoginAttempt)) < 60000) { // 60000ms = 1 minute
        throw new Error('Too many login attempts. Please try again later.');
    }

    // Validate password
    if (user[1] !== password) { // Assuming the 2nd column is password
        throw new Error('Incorrect password.');
    }

    // Update last login attempt
    sheet.getRange(users.indexOf(user) + 1, 3).setValue(currentTime);
    return 'Login successful!';
}

function registerUser(email, password) {
    // Input validation
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }

    // Check if user already exists
    const sheet = SpreadsheetApp.openById('your_sheet_id_here').getSheetByName('Users');
    const users = sheet.getValues();
    const userExists = users.some(row => row[0] === email);

    if (userExists) {
        throw new Error('User already exists.');
    }

    // Add new user to the Google Sheet
    sheet.appendRow([email, password, '']); // Assuming 3rd column is for tracking
    return 'Registration successful!';
}