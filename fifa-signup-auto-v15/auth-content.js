/**
 * Auth.FIFA.com Content Script
 * AUTO-TRIGGERS Alt+X when on form pages
 * Handles: Sign Up, Sign In, User Already Exists error
 */

(function() {
  console.log('[FIFA Auto Flow] Auth FIFA page detected:', window.location.href);

  let signInHandled = false;
  let signUpFormHandled = false;
  let passwordHandled = false;
  let emailVerifyHandled = false;
  let userExistsHandled = false;
  let signInFormHandled = false;
  let signInOTPHandled = false;

  // Simulate Alt+X keypress to trigger TM_Autofill
  function triggerAltX() {
    console.log('[FIFA Auto Flow] Triggering Alt+X...');
    const event = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      altKey: true,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  function clickSignUp() {
    const links = document.querySelectorAll('a, button');
    for (const link of links) {
      const text = link.textContent.trim().toLowerCase();
      if (text === 'sign up' || text === 'signup' || text === 'create account') {
        console.log('[FIFA Auto Flow] Found Sign Up button, clicking...');
        link.click();
        return true;
      }
    }
    return false;
  }

  function clickSignIn() {
    const links = document.querySelectorAll('a, button');
    for (const link of links) {
      const text = link.textContent.trim().toLowerCase();
      if (text === 'sign in' || text === 'signin' || text === 'log in' || text === 'login') {
        console.log('[FIFA Auto Flow] Found Sign In link, clicking...');
        link.click();
        return true;
      }
    }
    return false;
  }

  function clickContinue() {
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of buttons) {
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (text === 'continue' || text === 'submit' || text === 'next' || text === 'create account') {
        console.log('[FIFA Auto Flow] Found Continue button, clicking...');
        btn.click();
        return true;
      }
    }
    return false;
  }

  function clickSignInButton() {
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of buttons) {
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (text === 'sign in' || text === 'signin' || text === 'log in' || text === 'login') {
        console.log('[FIFA Auto Flow] Found Sign In button, clicking...');
        btn.click();
        return true;
      }
    }
    return false;
  }

  // Check for "User already exists" error
  function hasUserExistsError() {
    const pageText = document.body.innerText.toLowerCase();
    return pageText.includes('user already exists') ||
           pageText.includes('user already exist') ||
           pageText.includes('account already exists') ||
           pageText.includes('email already exists') ||
           pageText.includes('email already registered');
  }

  function isSignInPage() {
    const hasSignInHeading = document.body.innerText.includes('Sign In');
    const hasSignUpLink = Array.from(document.querySelectorAll('a, button')).some(
      el => el.textContent.trim().toLowerCase() === 'sign up'
    );
    return hasSignInHeading && hasSignUpLink;
  }

  // Check if this is a Sign In FORM (not the landing page but actual form with email/password)
  function isSignInForm() {
    const pageText = document.body.innerText;
    const hasSignInHeading = pageText.includes('Sign In');
    const hasEmailField = document.querySelector('input[type="email"]') || document.querySelector('#email');
    const hasPasswordField = document.querySelector('input[type="password"]');
    const hasSignInButton = Array.from(document.querySelectorAll('button')).some(
      btn => btn.textContent.trim().toLowerCase() === 'sign in'
    );
    // It's a sign in form if it has email AND password fields (not just email like sign up)
    return hasSignInHeading && hasEmailField && hasPasswordField && hasSignInButton;
  }

  function isSignUpForm() {
    // Step 1: Main sign up form with email, name, country, DOB
    const pageText = document.body.innerText;
    const isStep1 = pageText.includes('Step 1 of 2') || pageText.includes('1 of 2');
    const hasEmail = document.querySelector('#email');
    const hasFirstname = document.querySelector('#firstname');
    const hasDateOfBirth = pageText.includes('Date of Birth');
    const hasCountry = pageText.includes('Country of Residence');
    // Make sure it's not showing "User already exists" error
    if (hasUserExistsError()) return false;
    return isStep1 || (hasEmail && hasFirstname) || hasDateOfBirth || hasCountry;
  }

  function isPasswordPage() {
    // Step 2: Password creation page
    const pageText = document.body.innerText;
    const isStep2 = pageText.includes('Step 2 of 2') || pageText.includes('2 of 2');
    const hasCreatePassword = pageText.includes('Create a password') || pageText.includes('Create your Password');
    const hasConfirmPassword = pageText.includes('Confirm Password');
    const noFirstname = !document.querySelector('#firstname');
    return isStep2 || (hasCreatePassword && hasConfirmPassword && noFirstname);
  }

  function isEmailVerifyPage() {
    // Email verification page with "Check your email" and "Enter Code" (Sign Up flow)
    const pageText = document.body.innerText;
    const hasCheckEmail = pageText.includes('Check your email');
    const hasEnterCode = pageText.includes('Enter Code') || document.querySelector('input[placeholder*="Code"]');
    const hasVerifyButton = pageText.includes('Verify My Code') || pageText.includes('Verify');
    return hasCheckEmail || (hasEnterCode && hasVerifyButton);
  }

  function isSignInOTPPage() {
    // Sign In OTP/verification page - different from Sign Up email verify
    const pageText = document.body.innerText;
    const hasSignInCode = pageText.includes('Sign-In Code') ||
                          pageText.includes('Sign In Code') ||
                          pageText.includes('Enter Sign-In Code') ||
                          pageText.includes('verification code') ||
                          pageText.includes('Verification Code') ||
                          pageText.includes('Enter the code') ||
                          pageText.includes('enter the code') ||
                          pageText.includes('sent you a code') ||
                          pageText.includes('Enter code');
    const hasCodeInput = document.querySelector('input[placeholder*="code"]') ||
                         document.querySelector('input[placeholder*="Code"]') ||
                         document.querySelector('input[name*="code"]') ||
                         document.querySelector('input[name*="otp"]') ||
                         document.querySelector('input[autocomplete="one-time-code"]') ||
                         document.querySelector('input[type="text"]');
    const hasSignInButton = pageText.includes('SIGN IN') || pageText.includes('Sign In') ||
                            pageText.includes('Verify') || pageText.includes('Submit') || pageText.includes('Continue');
    // Make sure it's not the sign up "Check your email" page
    const isNotSignUpVerify = !pageText.includes('Check your email');
    // Also check if page has "Resend Sign-In Code" which is specific to this page
    const hasResendCode = pageText.includes('Resend Sign-In Code') || pageText.includes('Resend');
    return (hasSignInCode || hasResendCode) && hasCodeInput && hasSignInButton && isNotSignUpVerify;
  }

  // Handle "User already exists" error - click Sign In link
  function handleUserExistsError() {
    if (userExistsHandled) return;
    userExistsHandled = true;

    console.log('[FIFA Auto Flow] User already exists error detected - clicking Sign In...');
    setTimeout(() => {
      clickSignIn();
    }, 1000);
  }

  // Handle Sign In FORM - fill with Alt+X and click Sign In
  function handleSignInForm() {
    if (signInFormHandled) return;
    signInFormHandled = true;

    console.log('[FIFA Auto Flow] Sign In form detected - AUTO triggering Alt+X...');
    setTimeout(() => {
      triggerAltX();

      // After Alt+X fills email/password, click Sign In button
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Clicking Sign In button after form fill...');
        clickSignInButton();
      }, 2500);
    }, 2000);
  }

  function handleSignInPage() {
    if (signInHandled) return;
    signInHandled = true;

    console.log('[FIFA Auto Flow] Sign In page - clicking Sign Up...');
    setTimeout(() => {
      clickSignUp();
    }, 1500);
  }

  function handleSignUpForm() {
    if (signUpFormHandled) return;
    signUpFormHandled = true;

    console.log('[FIFA Auto Flow] Sign Up form detected - AUTO triggering Alt+X in 2 seconds...');

    // Wait for page to fully load, then trigger Alt+X
    setTimeout(() => {
      triggerAltX();

      // After Alt+X fills the form, wait and click Continue
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Clicking Continue after form fill...');
        clickContinue();
      }, 3000);
    }, 2000);
  }

  function handlePasswordPage() {
    if (passwordHandled) return;
    passwordHandled = true;

    console.log('[FIFA Auto Flow] Password page - AUTO triggering Alt+X...');
    setTimeout(() => {
      triggerAltX();

      // After Alt+X fills password, click Continue
      setTimeout(() => {
        clickContinue();
      }, 2000);
    }, 1500);
  }

  function handleEmailVerifyPage() {
    if (emailVerifyHandled) return;
    emailVerifyHandled = true;

    console.log('[FIFA Auto Flow] Email verification page - waiting 10 seconds for OTP...');

    // Wait 10 seconds for OTP to arrive
    setTimeout(() => {
      // First, click the code input box to focus it
      console.log('[FIFA Auto Flow] Clicking code input box...');
      const codeInput = document.querySelector('input[placeholder*="Code"]') ||
                        document.querySelector('input[name*="code"]') ||
                        document.querySelector('input[type="text"]');
      if (codeInput) {
        codeInput.click();
        codeInput.focus();
        console.log('[FIFA Auto Flow] Code input focused');
      }

      // Wait a moment, then trigger Alt+X
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Triggering Alt+X to fill OTP code...');
        triggerAltX();

        // After Alt+X fills the code, click Verify button
        setTimeout(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = (btn.textContent || '').trim().toLowerCase();
            if (text.includes('verify')) {
              console.log('[FIFA Auto Flow] Clicking Verify button...');
              btn.click();
              return;
            }
          }
        }, 2000);
      }, 500);
    }, 10000); // 10 second wait
  }

  function handleSignInOTPPage() {
    if (signInOTPHandled) return;
    signInOTPHandled = true;

    console.log('[FIFA Auto Flow] Sign In OTP page detected - waiting 10 seconds for OTP...');

    // Wait 10 seconds for OTP to arrive
    setTimeout(() => {
      // First, click the code input box to focus it
      console.log('[FIFA Auto Flow] Clicking code input box...');
      const codeInput = document.querySelector('input[placeholder*="code"]') ||
                        document.querySelector('input[placeholder*="Code"]') ||
                        document.querySelector('input[name*="code"]') ||
                        document.querySelector('input[name*="otp"]') ||
                        document.querySelector('input[autocomplete="one-time-code"]') ||
                        document.querySelector('input[type="text"]') ||
                        document.querySelector('input[type="number"]');
      if (codeInput) {
        codeInput.click();
        codeInput.focus();
        console.log('[FIFA Auto Flow] Code input focused');
      }

      // Wait a moment, then trigger Alt+X
      setTimeout(() => {
        console.log('[FIFA Auto Flow] Triggering Alt+X to fill OTP code...');
        triggerAltX();

        // After Alt+X fills the code, click Submit/Verify/Continue button
        setTimeout(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = (btn.textContent || '').trim().toLowerCase();
            if (text.includes('verify') || text.includes('submit') || text.includes('continue') || text.includes('sign in')) {
              console.log('[FIFA Auto Flow] Clicking submit button...');
              btn.click();
              return;
            }
          }
        }, 2000);
      }, 500);
    }, 10000); // 10 second wait
  }

  function checkPage() {
    // FIRST: Check for "User already exists" error - highest priority
    // This means sign up failed, so we need to sign in instead
    if (hasUserExistsError()) {
      handleUserExistsError();
      return;
    }

    // Sign Up form - AUTO trigger Alt+X (check this BEFORE sign in)
    if (isSignUpForm()) {
      handleSignUpForm();
      return;
    }

    // Password page - AUTO trigger Alt+X
    if (isPasswordPage()) {
      handlePasswordPage();
      return;
    }

    // Email verification page (Sign Up) - wait 10s then Alt+X for OTP
    if (isEmailVerifyPage()) {
      handleEmailVerifyPage();
      return;
    }

    // Sign In OTP page - wait 10s then Alt+X for OTP
    if (isSignInOTPPage()) {
      handleSignInOTPPage();
      return;
    }

    // Sign In page (landing or form) - always click Sign Up first
    // Only handle sign in form AFTER user already exists error redirects here
    if (isSignInPage() || isSignInForm()) {
      // If we already tried sign up and got redirected back to sign in
      // (indicated by userExistsHandled being true), then fill sign in form
      if (userExistsHandled && isSignInForm()) {
        handleSignInForm();
        return;
      }
      // Otherwise, click Sign Up to go to sign up page first
      handleSignInPage();
      return;
    }
  }

  // Initial check after page loads
  setTimeout(checkPage, 2500);

  // Observe for page changes (SPA navigation)
  const observer = new MutationObserver(() => {
    setTimeout(checkPage, 1500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Periodic check every 3 seconds for Sign In OTP page (backup)
  setInterval(() => {
    if (!signInOTPHandled && isSignInOTPPage()) {
      console.log('[FIFA Auto Flow] Periodic check detected Sign In OTP page');
      handleSignInOTPPage();
    }
  }, 3000);
})();
