package com.smarthostel.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.*;

import java.time.Duration;
import java.util.UUID;

/**
 * Selenium Test Suite for Smart Hostel Registration and Login
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:5000
 * 2. Frontend served (use Live Server or similar) on http://localhost:5500
 * 3. MongoDB running
 * 
 * Run with: mvn test
 */
public class SmartHostelAuthTest {

    private WebDriver driver;
    private WebDriverWait wait;
    
    // Configuration - Update these URLs based on your setup
    private static final String BASE_URL = "http://localhost:5500/frontend/index.html";
    private static final String STUDENT_DASHBOARD_URL = "http://localhost:5500/frontend/student.html";
    private static final String WARDEN_DASHBOARD_URL = "http://localhost:5500/frontend/warden.html";
    private static final String GUARD_DASHBOARD_URL = "http://localhost:5500/frontend/guard.html";
    
    // Test data
    private String testEmail;
    private static final String TEST_PASSWORD = "Test@123456";
    private static final String TEST_NAME = "Test Student";
    private static final String TEST_HOSTEL = "Block A";
    private static final String TEST_ROOM = "101";
    private static final String TEST_PHONE = "9876543210";
    private static final String TEST_PARENT_PHONE = "9876543211";

    @BeforeClass
    public void setupClass() {
        // Setup WebDriver Manager - automatically downloads correct driver
        WebDriverManager.chromedriver().setup();
    }

    @BeforeMethod
    public void setup() {
        // Chrome options for better test stability
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        options.addArguments("--disable-notifications");
        options.addArguments("--disable-popup-blocking");
        // Uncomment for headless mode (no browser window)
        // options.addArguments("--headless");
        
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        
        // Generate unique email for each test run
        testEmail = "testuser_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
    }

    @AfterMethod
    public void teardown() {
        if (driver != null) {
            // Clear local storage before closing
            try {
                driver.executeScript("localStorage.clear();");
            } catch (Exception ignored) {}
            driver.quit();
        }
    }

    // ==================== REGISTRATION TESTS ====================

    @Test(priority = 1, description = "Test student registration with valid data")
    public void testStudentRegistration() {
        System.out.println("🧪 Testing Student Registration...");
        
        // Navigate to login page
        driver.get(BASE_URL);
        
        // Wait for page to load
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Click on "Register" link to switch to registration form
        WebElement registerLink = driver.findElement(By.cssSelector("#loginForm .toggle-text a"));
        registerLink.click();
        
        // Wait for registration form to be visible
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        // Fill in registration form
        fillRegistrationForm("student");
        
        // Click Register button
        WebElement registerButton = driver.findElement(By.cssSelector("#registerForm button[type='submit']"));
        registerButton.click();
        
        // Wait for success message or redirect
        wait.until(ExpectedConditions.or(
            ExpectedConditions.urlContains("student.html"),
            ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".message.success"))
        ));
        
        // Verify registration success - should redirect to student dashboard
        String currentUrl = driver.getCurrentUrl();
        System.out.println("✅ Registration successful! Redirected to: " + currentUrl);
        Assert.assertTrue(currentUrl.contains("student.html"), "Should redirect to student dashboard after registration");
    }

    @Test(priority = 2, description = "Test warden registration")
    public void testWardenRegistration() {
        System.out.println("🧪 Testing Warden Registration...");
        
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Switch to register form
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        // Fill form with warden role
        fillRegistrationForm("warden");
        
        // Submit
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for redirect
        wait.until(ExpectedConditions.urlContains("warden.html"));
        
        System.out.println("✅ Warden registration successful!");
        Assert.assertTrue(driver.getCurrentUrl().contains("warden.html"));
    }

    @Test(priority = 3, description = "Test guard registration")
    public void testGuardRegistration() {
        System.out.println("🧪 Testing Guard Registration...");
        
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Switch to register form
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        // Fill form with guard role
        fillRegistrationForm("guard");
        
        // Submit
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for redirect
        wait.until(ExpectedConditions.urlContains("guard.html"));
        
        System.out.println("✅ Guard registration successful!");
        Assert.assertTrue(driver.getCurrentUrl().contains("guard.html"));
    }

    // ==================== LOGIN TESTS ====================

    @Test(priority = 4, description = "Test login with valid credentials")
    public void testValidLogin() {
        System.out.println("🧪 Testing Valid Login...");
        
        // First register a user
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        String loginEmail = "login_test_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
        
        // Fill registration
        driver.findElement(By.id("regName")).sendKeys(TEST_NAME);
        driver.findElement(By.id("regEmail")).sendKeys(loginEmail);
        driver.findElement(By.id("regPassword")).sendKeys(TEST_PASSWORD);
        new Select(driver.findElement(By.id("regRole"))).selectByValue("student");
        driver.findElement(By.id("regHostel")).sendKeys(TEST_HOSTEL);
        driver.findElement(By.id("regRoom")).sendKeys(TEST_ROOM);
        
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for redirect to dashboard
        wait.until(ExpectedConditions.urlContains("student.html"));
        
        // Logout - clear storage and go back to login
        driver.executeScript("localStorage.clear();");
        driver.get(BASE_URL);
        
        // Now test login
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Fill login form
        driver.findElement(By.id("loginEmail")).sendKeys(loginEmail);
        driver.findElement(By.id("loginPassword")).sendKeys(TEST_PASSWORD);
        
        // Click login button
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
        
        // Wait for redirect
        wait.until(ExpectedConditions.urlContains("student.html"));
        
        System.out.println("✅ Login successful!");
        Assert.assertTrue(driver.getCurrentUrl().contains("student.html"));
    }

    @Test(priority = 5, description = "Test login with invalid credentials")
    public void testInvalidLogin() {
        System.out.println("🧪 Testing Invalid Login...");
        
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Fill with invalid credentials
        driver.findElement(By.id("loginEmail")).sendKeys("nonexistent@test.com");
        driver.findElement(By.id("loginPassword")).sendKeys("wrongpassword");
        
        // Click login
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
        
        // Wait for error message
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".message.error")));
        
        WebElement errorMessage = driver.findElement(By.cssSelector(".message.error"));
        System.out.println("✅ Error message displayed: " + errorMessage.getText());
        Assert.assertTrue(errorMessage.isDisplayed(), "Error message should be displayed");
    }

    @Test(priority = 6, description = "Test registration with duplicate email")
    public void testDuplicateEmailRegistration() {
        System.out.println("🧪 Testing Duplicate Email Registration...");
        
        String duplicateEmail = "duplicate_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
        
        // First registration
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        driver.findElement(By.id("regName")).sendKeys(TEST_NAME);
        driver.findElement(By.id("regEmail")).sendKeys(duplicateEmail);
        driver.findElement(By.id("regPassword")).sendKeys(TEST_PASSWORD);
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        wait.until(ExpectedConditions.urlContains("student.html"));
        
        // Clear and try to register again with same email
        driver.executeScript("localStorage.clear();");
        driver.get(BASE_URL);
        
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        driver.findElement(By.id("regName")).sendKeys("Another User");
        driver.findElement(By.id("regEmail")).sendKeys(duplicateEmail);
        driver.findElement(By.id("regPassword")).sendKeys(TEST_PASSWORD);
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for error message
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".message.error")));
        
        WebElement errorMessage = driver.findElement(By.cssSelector(".message.error"));
        System.out.println("✅ Duplicate email error: " + errorMessage.getText());
        Assert.assertTrue(errorMessage.getText().toLowerCase().contains("exists") || 
                         errorMessage.getText().toLowerCase().contains("already"),
                         "Should show error for duplicate email");
    }

    // ==================== HELPER METHODS ====================

    private void fillRegistrationForm(String role) {
        // Generate unique email for this registration
        String uniqueEmail = role + "_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
        
        // Fill all fields
        WebElement nameField = driver.findElement(By.id("regName"));
        nameField.clear();
        nameField.sendKeys(TEST_NAME + " " + role.toUpperCase());
        
        WebElement emailField = driver.findElement(By.id("regEmail"));
        emailField.clear();
        emailField.sendKeys(uniqueEmail);
        
        WebElement passwordField = driver.findElement(By.id("regPassword"));
        passwordField.clear();
        passwordField.sendKeys(TEST_PASSWORD);
        
        // Select role from dropdown
        Select roleSelect = new Select(driver.findElement(By.id("regRole")));
        roleSelect.selectByValue(role);
        
        WebElement hostelField = driver.findElement(By.id("regHostel"));
        hostelField.clear();
        hostelField.sendKeys(TEST_HOSTEL);
        
        WebElement roomField = driver.findElement(By.id("regRoom"));
        roomField.clear();
        roomField.sendKeys(TEST_ROOM);
        
        WebElement phoneField = driver.findElement(By.id("regPhone"));
        phoneField.clear();
        phoneField.sendKeys(TEST_PHONE);
        
        WebElement parentPhoneField = driver.findElement(By.id("regParentPhone"));
        parentPhoneField.clear();
        parentPhoneField.sendKeys(TEST_PARENT_PHONE);
        
        System.out.println("📝 Filled registration form for " + role + " with email: " + uniqueEmail);
    }

    // ==================== MAIN METHOD FOR STANDALONE EXECUTION ====================

    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("🏨 Smart Hostel Authentication Tests");
        System.out.println("========================================\n");
        
        SmartHostelAuthTest test = new SmartHostelAuthTest();
        
        try {
            test.setupClass();
            
            // Run tests manually
            System.out.println("\n--- Test 1: Student Registration ---");
            test.setup();
            test.testStudentRegistration();
            test.teardown();
            
            System.out.println("\n--- Test 2: Warden Registration ---");
            test.setup();
            test.testWardenRegistration();
            test.teardown();
            
            System.out.println("\n--- Test 3: Guard Registration ---");
            test.setup();
            test.testGuardRegistration();
            test.teardown();
            
            System.out.println("\n--- Test 4: Valid Login ---");
            test.setup();
            test.testValidLogin();
            test.teardown();
            
            System.out.println("\n--- Test 5: Invalid Login ---");
            test.setup();
            test.testInvalidLogin();
            test.teardown();
            
            System.out.println("\n--- Test 6: Duplicate Email ---");
            test.setup();
            test.testDuplicateEmailRegistration();
            test.teardown();
            
            System.out.println("\n========================================");
            System.out.println("✅ All tests completed!");
            System.out.println("========================================");
            
        } catch (Exception e) {
            System.err.println("❌ Test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
