import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.Select;

public class second {

	public static void main(String[] args) {
		// Set ChromeDriver path
		System.setProperty("webdriver.chrome.driver", "C:\\Users\\Srikrishna Vadlamani\\Downloads\\chromedriver-win64\\chromedriver.exe");
		
		ChromeDriver driver = new ChromeDriver();
		
		try {
			// Open the application
			driver.get("http://127.0.0.1:5500/Smart-hostel/frontend/index.html");
			driver.manage().window().maximize();
			
			System.out.println("===== TEST: Registration and Login =====");
			
			// STEP 1: Click on Register link
			System.out.println("\nSTEP 1: Opening registration form...");
			WebElement registerLink = driver.findElement(By.cssSelector("#loginForm .toggle-text a"));
			registerLink.click();
			System.out.println("Registration form opened!");
			
			// STEP 2: Fill registration form
			System.out.println("\nSTEP 2: Filling registration details...");
			driver.findElement(By.id("regName")).sendKeys("John Doe");
			driver.findElement(By.id("regEmail")).sendKeys("johndoe@gmail.com");
			driver.findElement(By.id("regPassword")).sendKeys("johndoe123");
			
			Select roleSelect = new Select(driver.findElement(By.id("regRole")));
			roleSelect.selectByValue("student");
			
			driver.findElement(By.id("regHostel")).sendKeys("Block A");
			driver.findElement(By.id("regRoom")).sendKeys("101");
			driver.findElement(By.id("regPhone")).sendKeys("9876543210");
			driver.findElement(By.id("regParentPhone")).sendKeys("9876543211");
			System.out.println("Registration form filled!");
			
			// STEP 3: Submit registration
			System.out.println("\nSTEP 3: Submitting registration...");
			driver.findElement(By.cssSelector("#registerForm button[type='submit']")).click();
			Thread.sleep(2000);
			System.out.println("Registration submitted!");
			System.out.println("Current URL: " + driver.getCurrentUrl());
			
			// STEP 4: Go back to login page
			System.out.println("\nSTEP 4: Going back to login page...");
			driver.get("http://127.0.0.1:5500/Smart-hostel/frontend/index.html");
			Thread.sleep(1000);
			
			// STEP 5: Login with same credentials
			System.out.println("\nSTEP 5: Logging in...");
			driver.findElement(By.id("loginEmail")).sendKeys("johndoe@gmail.com");
			driver.findElement(By.id("loginPassword")).sendKeys("johndoe123");
			driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
			Thread.sleep(2000);
			System.out.println("Login submitted!");
			System.out.println("Current URL: " + driver.getCurrentUrl());
			
			System.out.println("\n===== TEST PASSED! =====");
			
		} catch (Exception e) {
			System.out.println("\n===== TEST FAILED! =====");
			System.out.println("Error: " + e.getMessage());
			e.printStackTrace();
		} finally {
			driver.quit();
		}
	}

}