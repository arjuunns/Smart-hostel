package com.smarthostel.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * End-to-End Test for Complete Leave Flow
 * Tests: Student applies leave -> Warden approves -> Student gets QR -> Guard scans
 */
public class SmartHostelLeaveFlowTest {

    private WebDriver driver;
    private WebDriverWait wait;
    
    private static final String BASE_URL = "http://localhost:5500/frontend/index.html";
    private static final String STUDENT_DASHBOARD = "http://localhost:5500/frontend/student.html";
    private static final String WARDEN_DASHBOARD = "http://localhost:5500/frontend/warden.html";
    private static final String GUARD_DASHBOARD = "http://localhost:5500/frontend/guard.html";
    
    // Shared test data
    private String studentEmail;
    private String wardenEmail;
    private String guardEmail;
    private static final String PASSWORD = "Test@123456";
    private String uniqueId;

    @BeforeClass
    public void setupClass() {
        WebDriverManager.chromedriver().setup();
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
        studentEmail = "student_" + uniqueId + "@test.com";
        wardenEmail = "warden_" + uniqueId + "@test.com";
        guardEmail = "guard_" + uniqueId + "@test.com";
    }

    @BeforeMethod
    public void setup() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--start-maximized");
        options.addArguments("--disable-notifications");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @AfterMethod
    public void teardown() {
        if (driver != null) {
            try {
                ((JavascriptExecutor) driver).executeScript("localStorage.clear();");
            } catch (Exception ignored) {}
            driver.quit();
        }
    }

    // ==================== SETUP TESTS ====================

    @Test(priority = 1, description = "Register test users")
    public void setupTestUsers() {
        System.out.println("🧪 Setting up test users...");
        
        // Register Student
        registerUser(studentEmail, "Test Student", "student", "Block A", "101");
        System.out.println("✅ Student registered: " + studentEmail);
        
        // Logout
        clearSessionAndGoToLogin();
        
        // Register Warden
        registerUser(wardenEmail, "Test Warden", "warden", "Block A", "Admin");
        System.out.println("✅ Warden registered: " + wardenEmail);
        
        // Logout
        clearSessionAndGoToLogin();
        
        // Register Guard
        registerUser(guardEmail, "Test Guard", "guard", "Main Gate", "Guard Room");
        System.out.println("✅ Guard registered: " + guardEmail);
    }

    // ==================== LEAVE FLOW TESTS ====================

    @Test(priority = 2, dependsOnMethods = "setupTestUsers", description = "Student applies for leave")
    public void testStudentAppliesLeave() {
        System.out.println("🧪 Student applying for leave...");
        
        // Login as student
        login(studentEmail, PASSWORD);
        wait.until(ExpectedConditions.urlContains("student.html"));
        
        // Click on "Apply Leave" in sidebar
        WebElement applyLeaveNav = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//a[contains(text(), 'Apply Leave')]")
        ));
        applyLeaveNav.click();
        
        // Wait for apply leave section
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("leaveForm")));
        
        // Fill leave form
        Select leaveTypeSelect = new Select(driver.findElement(By.id("leaveType")));
        leaveTypeSelect.selectByValue("REGULAR");
        
        // Set from date (tomorrow)
        LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);
        String fromDateTime = tomorrow.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        WebElement fromField = driver.findElement(By.id("fromDateTime"));
        ((JavascriptExecutor) driver).executeScript("arguments[0].value = arguments[1]", fromField, fromDateTime);
        
        // Set to date (day after tomorrow)
        LocalDateTime dayAfter = LocalDateTime.now().plusDays(2);
        String toDateTime = dayAfter.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        WebElement toField = driver.findElement(By.id("toDateTime"));
        ((JavascriptExecutor) driver).executeScript("arguments[0].value = arguments[1]", toField, toDateTime);
        
        // Fill reason
        WebElement reasonField = driver.findElement(By.id("reason"));
        reasonField.sendKeys("Family function - Selenium test leave request");
        
        // Submit
        driver.findElement(By.cssSelector("#leaveForm button[type='submit']")).click();
        
        // Wait for success message
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector(".message.success")));
        
        System.out.println("✅ Leave application submitted successfully!");
    }

    @Test(priority = 3, dependsOnMethods = "testStudentAppliesLeave", description = "Warden approves leave")
    public void testWardenApprovesLeave() {
        System.out.println("🧪 Warden approving leave...");
        
        // Login as warden
        login(wardenEmail, PASSWORD);
        wait.until(ExpectedConditions.urlContains("warden.html"));
        
        // Click on "Pending Leaves" in sidebar
        WebElement pendingNav = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//a[contains(text(), 'Pending Leaves')]")
        ));
        pendingNav.click();
        
        // Wait for pending leaves table
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("pendingLeavesTable")));
        
        // Small delay to let data load
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        
        // Find and click Review button for our student's leave
        WebElement reviewButton = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//button[contains(text(), 'Review')]")
        ));
        reviewButton.click();
        
        // Wait for modal
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("decisionModal")));
        
        // Add remarks
        WebElement remarksField = driver.findElement(By.id("decisionRemarks"));
        remarksField.sendKeys("Approved - Selenium test");
        
        // Click Approve button
        WebElement approveButton = driver.findElement(By.xpath("//button[contains(text(), 'Approve')]"));
        approveButton.click();
        
        // Wait for success toast or table update
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        
        System.out.println("✅ Leave approved by warden!");
    }

    @Test(priority = 4, dependsOnMethods = "testWardenApprovesLeave", description = "Student views QR code")
    public void testStudentViewsQRCode() {
        System.out.println("🧪 Student viewing QR code...");
        
        // Login as student
        login(studentEmail, PASSWORD);
        wait.until(ExpectedConditions.urlContains("student.html"));
        
        // Click on "My Leaves" in sidebar
        WebElement myLeavesNav = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//a[contains(text(), 'My Leaves')]")
        ));
        myLeavesNav.click();
        
        // Wait for leaves table
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("allLeavesTable")));
        
        // Small delay
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
        
        // Find and click "View QR" button
        WebElement viewQRButton = wait.until(ExpectedConditions.elementToBeClickable(
            By.xpath("//button[contains(text(), 'View QR')]")
        ));
        viewQRButton.click();
        
        // Wait for QR modal
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("qrModal")));
        
        // Verify QR code image is displayed
        WebElement qrImage = driver.findElement(By.cssSelector("#qrContent img"));
        Assert.assertTrue(qrImage.isDisplayed(), "QR code image should be displayed");
        
        // Get gate pass ID
        WebElement gatePassIdElement = driver.findElement(By.cssSelector(".gate-pass-id"));
        String gatePassId = gatePassIdElement.getText();
        System.out.println("✅ QR Code displayed with Gate Pass ID: " + gatePassId);
        
        Assert.assertTrue(gatePassId.startsWith("GP-"), "Gate pass ID should start with GP-");
    }

    // ==================== HELPER METHODS ====================

    private void registerUser(String email, String name, String role, String hostel, String room) {
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        // Switch to register form
        driver.findElement(By.cssSelector("#loginForm .toggle-text a")).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("registerForm")));
        
        // Fill form
        driver.findElement(By.id("regName")).sendKeys(name);
        driver.findElement(By.id("regEmail")).sendKeys(email);
        driver.findElement(By.id("regPassword")).sendKeys(PASSWORD);
        new Select(driver.findElement(By.id("regRole"))).selectByValue(role);
        driver.findElement(By.id("regHostel")).sendKeys(hostel);
        driver.findElement(By.id("regRoom")).sendKeys(room);
        driver.findElement(By.id("regPhone")).sendKeys("9876543210");
        driver.findElement(By.id("regParentPhone")).sendKeys("9876543211");
        
        // Submit
        driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
        
        // Wait for redirect
        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
    }

    private void login(String email, String password) {
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
        
        driver.findElement(By.id("loginEmail")).sendKeys(email);
        driver.findElement(By.id("loginPassword")).sendKeys(password);
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
    }

    private void clearSessionAndGoToLogin() {
        ((JavascriptExecutor) driver).executeScript("localStorage.clear();");
        driver.get(BASE_URL);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
    }

    // ==================== MAIN METHOD ====================

    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("🏨 Smart Hostel Leave Flow E2E Test");
        System.out.println("========================================\n");
        
        SmartHostelLeaveFlowTest test = new SmartHostelLeaveFlowTest();
        
        try {
            test.setupClass();
            
            System.out.println("\n--- Setting up test users ---");
            test.setup();
            test.setupTestUsers();
            test.teardown();
            
            System.out.println("\n--- Student applies for leave ---");
            test.setup();
            test.testStudentAppliesLeave();
            test.teardown();
            
            System.out.println("\n--- Warden approves leave ---");
            test.setup();
            test.testWardenApprovesLeave();
            test.teardown();
            
            System.out.println("\n--- Student views QR code ---");
            test.setup();
            test.testStudentViewsQRCode();
            test.teardown();
            
            System.out.println("\n========================================");
            System.out.println("✅ All E2E tests completed successfully!");
            System.out.println("========================================");
            
        } catch (Exception e) {
            System.err.println("❌ Test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
