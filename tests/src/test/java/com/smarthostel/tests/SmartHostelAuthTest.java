package com.smarthostel.tests;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.UUID;

/**
 * Selenium Test for Smart Hostel - Registration and Login Flow
 * Tests: User registers -> Logs out -> Logs in with same credentials
 * 
 * Compatible with Chrome WebDriver and Eclipse IDE
 * 
 * Prerequisites:
 * 1. Download ChromeDriver from: https://chromedriver.chromium.org/downloads
 * 2. Update CHROME_DRIVER_PATH below with your chromedriver.exe location
 * 3. Backend server running on http://localhost:5000
 * 4. Frontend served on http://localhost:5500
 * 5. MongoDB running
 * 
 * Run: Right-click this file in Eclipse -> Run As -> Java Application
 */
public class SmartHostelAuthTest {

    private WebDriver driver;
    private WebDriverWait wait;
    
    // ========== CONFIGURATION - UPDATE THIS PATH ==========
    private static final String CHROME_DRIVER_PATH = "C:\\chromedriver\\chromedriver.exe";
    
    // URLs
    private static final String BASE_URL = "http://localhost:5500/frontend/index.html";
    
    // Test credentials (will be used for both registration and login)
    private String testEmail;
    private static final String TEST_PASSWORD = "Test@123456";
    private static final String TEST_NAME = "Test User";
    private static final String TEST_HOSTEL = "Block A";
    private static final String TEST_ROOM = "101";
    private static final String TEST_PHONE = "9876543210";
    private static final String TEST_PARENT_PHONE = "9876543211";

    /**
     * Setup ChromeDriver
     */
    public void setup() {
        // Set ChromeDriver path
        System.setProperty("webdriver.chrome.driver", CHROME_DRIVER_PATH);
        
        // Chrome options
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        options.addArguments("--disable-notifications");
        options.addArguments("--disable-popup-blocking");
        options.addArguments("--remote-allow-origins=*");
        
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        
        // Generate unique email for this test
        testEmail = "testuser_" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
    }

    /**
     * Cleanup
     */
    public void teardown() {
        if (driver != null) {
            driver.quit();
        }
    }

    /**
     * Main Test: Register -> Logout -> Login
     */
    public void testRegisterAndLogin() {
        System.out.println("========================================");
        System.out.println("Test: Register -> Logout -> Login");
        System.out.println("========================================\n");
        
        // STEP 1: Go to the page and switch to Registration form
        System.out.println("STEP 1: Opening registration form...");
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Click on "Register" link to switch to registration form
        WebElement registerLink = driver.findElement(By.cssSelector("#loginForm .toggle-text a"));
        registerLink.click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        System.out.println("Registration form opened successfully!\n");
        
        // STEP 2: Fill registration details
        System.out.println("STEP 2: Filling registration details...");
        System.out.println("   Email: " + testEmail);
        System.out.println("   Name: " + TEST_NAME);
        System.out.println("   Password: " + TEST_PASSWORD);
        
        driver.findElement(By.id("regName")).sendKeys(TEST_NAME);
        driver.findElement(By.id("regEmail")).sendKeys(testEmail);
        driver.findElement(By.id("regPassword")).sendKeys(TEST_PASSWORD);
        new Select(driver.findElement(By.id("regRole"))).selectByValue("student");
        driver.findElement(By.id("regHostel")).sendKeys(TEST_HOSTEL);
        driver.findElement(By.id("regRoom")).sendKeys(TEST_ROOM);
        driver.findElement(By.id("regPhone")).sendKeys(TEST_PHONE);
        driver.findElement(By.id("regParentPhone")).sendKeys(TEST_PARENT_PHONE);
        System.out.println("Registration form filled!\n");
        
        // STEP 3: Click Register button
        System.out.println("STEP 3: Submitting registration...");
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for redirect to student dashboard
        wait.until(ExpectedConditions.urlContains("student.html"));
        System.out.println("Registration successful! Redirected to: " + driver.getCurrentUrl() + "\n");
        
        // STEP 4: Logout (clear localStorage and go back to login page)
        System.out.println("STEP 4: Logging out...");
        ((JavascriptExecutor) driver).executeScript("localStorage.clear();");
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        System.out.println("Logged out! Back to login page.\n");
        
        // STEP 5: Login with the same credentials
        System.out.println("STEP 5: Logging in with same credentials...");
        System.out.println("   Email: " + testEmail);
        System.out.println("   Password: " + TEST_PASSWORD);
        
        driver.findElement(By.id("loginEmail")).sendKeys(testEmail);
        driver.findElement(By.id("loginPassword")).sendKeys(TEST_PASSWORD);
        
        // Click login button
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
        
        // Wait for redirect to dashboard
        wait.until(ExpectedConditions.urlContains("student.html"));
        System.out.println("Login successful! Redirected to: " + driver.getCurrentUrl() + "\n");
        
        // Verify we're on the student dashboard
        if (driver.getCurrentUrl().contains("student.html")) {
            System.out.println("========================================");
            System.out.println("TEST PASSED!");
            System.out.println("User successfully registered and logged in");
            System.out.println("========================================");
        } else {
            throw new AssertionError("Login failed - not redirected to dashboard");
        }
    }

    /**
     * Main method - Run in Eclipse IDE
     */
    public static void main(String[] args) {
        SmartHostelAuthTest test = new SmartHostelAuthTest();
        
        try {
            test.setup();
            test.testRegisterAndLogin();
        } catch (Exception e) {
            System.err.println("\n========================================");
            System.err.println("TEST FAILED!");
            System.err.println("Error: " + e.getMessage());
            System.err.println("========================================");
            e.printStackTrace();
        } finally {
            test.teardown();
        }
    }
}
