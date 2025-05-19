<img src="public/Ventologix_02.jpg" alt="Ventologix Logo" width="300">

# Ventologix

## How to Run the Web Page

1. Ensure that you have Node.js installed on your system. You can download it from [Node.js official website](https://nodejs.org/).
2. Open your terminal or command prompt and navigate to the project directory. For example:
    ```bash
    cd \Ventologix\webpage
    ```
3. Install all the required dependencies by executing the following command:
    ```bash
    npm install
    ```
    This will download and set up all the necessary packages for the project.
4. Start the development server by running:
    ```bash
    npm run dev
    ```
    This command will launch a local server to preview the webpage.
5. Once the server is running, open your preferred web browser and navigate to the URL displayed in the terminal (usually `http://localhost:3000` or similar). You should now see the Ventologix webpage.

## Instructions to Run the Web Page

To run the webpage, follow the steps below:

### Prerequisites
1. Make sure you have installed:
    - [Python](https://www.python.org/downloads/)
    - [Node.js](https://nodejs.org/)

### Steps to Start the Project

1. Open two terminals from your text editor or IDE:
    - Go to the top menu and select `Terminal -> New Terminal`.

2. In both terminals, navigate to the project directory by running:
    ```bash
    cd webpage
    ```
    You should see something like this in the terminal:
    ```plaintext
    PS C:\Users\Vento\Desktop\Ventologix\webpage>
    ```

3. In the **first terminal**, run the following command to start the backend server:
    ```bash
    uvicorn scripts.api_server:app --reload
    ```
    Then, open the following link in your browser:
    [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

    If it does not open automatically, make sure to add `/docs` at the end of the URL.

4. In the **second terminal**, run the following command to start the frontend server:
    ```bash
    npm run dev
    ```
    Then, open the following link in your browser:
    [http://localhost:3000/](http://localhost:3000/)

That's it! You should now have the webpage running successfully.

## Description

The VTOs Dashboard webpage is designed to provide a comprehensive visualization of compressors from the VTOs. It serves as a user-friendly interface to monitor and analyze compressor data, ensuring efficient operation and maintenance. The platform is built with modern web technologies, offering a seamless and responsive experience for users. Whether you're an engineer, technician, or stakeholder, this tool aims to simplify the process of accessing critical information about compressor performance and status.