import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

public class register {

	public static void main(String[] args) throws InterruptedException {
		// TODO Auto-generated method stub
		System.setProperty("webdriver.chrome.driver",
                "C:\\Users\\Srikrishna Vadlamani\\Downloads\\chromedriver-win64\\chromedriver.exe");

        ChromeDriver driver = new ChromeDriver();

        driver.get("https://smart-hostel-9pjq.vercel.app/");
        Thread.sleep(2000);

        driver.manage().window().maximize();

        WebElement registerbutton = driver.findElement(By.xpath("//*[@id=\"register\"]"));
        registerbutton.click();
        Thread.sleep(1000);

        driver.findElement(By.id("regName")).sendKeys("abcde22");
        Thread.sleep(1000);

        driver.findElement(By.id("regEmail")).sendKeys("abcdefg12354@gmail.com");
        Thread.sleep(1000);

        WebElement passwordField = driver.findElement(By.id("regPassword"));
        passwordField.sendKeys("Test@123");
        Thread.sleep(1000);

        driver.findElement(By.id("regHostel")).sendKeys("A");
        Thread.sleep(1000);

        driver.findElement(By.id("regRoom")).sendKeys("234");
        Thread.sleep(1000);

        driver.findElement(By.id("regPhone")).sendKeys("1234567890");
        Thread.sleep(1000);

        driver.findElement(By.id("regParentPhone")).sendKeys("9876543210");
        Thread.sleep(1000);

        driver.findElement(By.name("register")).click();
        Thread.sleep(4000);
    }

}
