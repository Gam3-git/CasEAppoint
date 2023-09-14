const config_set = () => { return { 
  "court":"ศาลจังหวัดสมุทรสงคราม",
  "user":"xxxxx",
  "pass":"xxxxxx",
  "ip_webapp":"xxxxxxxxxx" 
}; }

//clg

const  get_Token = async () => {
  const setting = config_set();
  const url = `http://${setting.ip_webapp}/cojUser/api/v1/users/login`;
  const postBody = {"version":1,"name":setting.user,"passwords":setting.pass};
  try {
    const response = await axios.post(url, postBody);
    const data = response.headers.authorization;
    return  localStorage.setItem("TOKEN", data.replace("Bearer ", ""));

  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

const get_Data = async (token) => {
  const date = new Date(); 
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('th-TH', options);
  // const formattedDate = "26/06/2566";

  const setting = config_set();
  const url = `http://${setting.ip_webapp}/cojProceed/api/v1/proceed/searchElectronicAppointDateByCase/search?version=1`;
  const postBody = { "version":1, "appointDate": formattedDate, "offset":0, "limit":200 };
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await axios.post(url, postBody, config);
    console.log('POST request successful');
    return  response.data;

  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

const case_response = async () => {
  let token = localStorage.getItem("TOKEN");
  if(!token){
    await get_Token();
    token = localStorage.getItem("TOKEN");
  }
  const case_data = await get_Data(token);
  return case_data.data;
}

const get_13Data = async (litigantCard) => {

  if(litigantCard.length !== 13){ return undefined; }

  let token = localStorage.getItem("TOKEN");
  if(!token){
    await get_Token();
    token = localStorage.getItem("TOKEN");
  }

  const setting = config_set();
  const url = `http://${setting.ip_webapp}/cojInformation/api/v1/information/searchInformationCase/search?version=1&sort=accuDesc`;
  const postBody = { "version": 1, "offset": 0, "limit": -1, "litigantCard":litigantCard };
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await axios.post(url, postBody, config);
    console.log('POST request successful');
    return  response.data;

  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

const get_appointData = async (id_case) => {

  if(!id_case){ return undefined; }

  let token = localStorage.getItem("TOKEN");
  if(!token){
    await get_Token();
    token = localStorage.getItem("TOKEN");
  }

  const setting = config_set();

  const appoint_find = async () => {
    const url = `http://${setting.ip_webapp}/cojLookup/api/v1/appointLists?version=1&limit=-1`;
    const config = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
    try {
      const response = await axios.get(url, config);
      return  response.data.data ;
    } catch (error) {
      console.log('Error:', error);
      return null;
    }
  }

  const appoint_list = async (data) => {
    const list_appoint = await appoint_find();
    if(!data){ return; }
    return data.map(({reasonAppointId, ...rest}) => {
      const foundItem = list_appoint.find(item => item.id === reasonAppointId);
      const reasonAppointId_new = foundItem ? foundItem.appointListName : null;
      return {
        reasonAppointId,
        reasonAppointId_new,
        ...rest
      };
    });
  }

  
  const url = `http://${setting.ip_webapp}/cojProceed/api/v1/proceed/searchProceedAppointContinueResult/all/case/${id_case}?version=1&dir=desc&limit=-1&sort=startDate`;
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  try {
    const response = await axios.get(url, config);
    const data = await appoint_list(response.data.data);
    return  data ;

  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

const convertDate = (dateString) => {
  console.log(dateString);
  if(dateString === null || dateString === undefined ){ return '-' ;}
  const dateParts = dateString.split(" ")[0].split("/");
  const year = parseInt(dateParts[2], 10) - 543; // Convert to Buddhist era (BE)
  const month = parseInt(dateParts[1], 10) - 1; // Months are zero-based
  const day = parseInt(dateParts[0], 10);
  const date = new Date(year, month, day);

  if (isNaN(date)) { return '-'; }

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Bangkok"
  };
  const formattedDate = date.toLocaleDateString('th-TH', options);
  return formattedDate;
}


// Main function
document.addEventListener("DOMContentLoaded", async () => {

  const court_el = document.getElementById("court_text");
  court_el.textContent = config_set().court;

  const date = new Date(); 
  const options = { year: "numeric", month: "long", day: "numeric" };
  const thaiDateText = date.toLocaleDateString("th-TH", options);
  const span2_el = document.getElementById("count_text");
  const span_el = document.getElementById("day_text");
  span_el.textContent = thaiDateText;

  const data = await case_response() ;
  span2_el.textContent = data.length;

  data.sort((a, b) => {
    const timeA = new Date(`1970-01-01T${a.appointTime}`);
    const timeB = new Date(`1970-01-01T${b.appointTime}`);
    return timeA - timeB;
  });

  generateTable(data);

});

async function appoint_data(id) {
  Swal.close();
  const data = await get_appointData(id) ;
  // console.log(data);
  if(data.length > 0){
    let htmlContent = `<h3> รายละเอียดวันนัด : ${data.length} รายการ </h3> 
    <h3> ของคดีดำ  : ${data[0].caseBlackNo}  </h3> <hr />`;

      htmlContent += '<div class="col"><table class="table">';
      htmlContent += '<thead class="table-success"><tr> <th>#</th> <th>วันนัด</th> <th class="text-start">รายละเอียด</th> </tr></thead>';
      htmlContent += '<tbody>';

      data.forEach((item, index) => {
        htmlContent += `
          <tr>
            <td>${index + 1}</td>
            <td> ${ convertDate(item.startDate) } <br /> เวลา: ${item.choiceTime} น.</td>
            <td class="text-start">${item.reasonAppointId_new} <br /> บัลลังก์ ${item.judgeRoomName ? item.judgeRoomName : '-' } 
            </td>
          </tr>
        `;
      });

  htmlContent += '</tbody>';
  htmlContent += '</table></div>';
    
      Swal.fire({
        width: '80%',
        showConfirmButton: false,
        allowOutsideClick: true,
        html: ` ${htmlContent} `,
      });
  }


}

async function findText (num) {

  let condition ;
  switch (num) {
    case 1: condition = ['roomName']; break;
    default: condition = ['accuDesc','fullCaseId'];
  }

  const data = await case_response() ;
  const searchText = document.getElementById('searchText').value;
  if (searchText.trim() !== '') {
    const searchPattern = new RegExp(searchText, "i"); // "i" flag for case-insensitive search
    let filteredData = [];
    for (let i = 0; i < condition.length; i++) {
      filteredData = data.filter(item => searchPattern.test(item[condition[i]]));
      if (filteredData.length > 0) { break; }
    }
    generateTable(filteredData);
  } else {
    data.sort((a, b) => {
      const timeA = new Date(`1970-01-01T${a.appointTime}`);
      const timeB = new Date(`1970-01-01T${b.appointTime}`);
      return timeA - timeB;
    });
    generateTable(data);
  }
}

async function find13Case() {
  const litigantCard = document.getElementById('searchText').value;
  if(litigantCard.length !== 13){
    return Swal.fire({ title:'ระบุเลขบัตรไม่ถูกต้อง' ,icon: 'error',showConfirmButton: false, allowOutsideClick: true, timer: 2000 });
  }
  const data = await get_13Data(litigantCard) ;

  if(!data.success){
    return Swal.fire({ title:'ไม่พบข้อมูล' ,icon: 'success',showConfirmButton: false, allowOutsideClick: true, timer: 2000 });
  }
  const res = data.data;

  if(res.length > 0){

    console.log(res);
    let htmlContent = `<h3> คดีที่เกี่ยวข้อง : ${res.length} คดี </h3> <hr />`;

    htmlContent += '<div class="col"><table class="table">';
    htmlContent += '<thead class="table-success"><tr> <th>#</th> <th>เลขคดีดำ</th> <th class="text-start">รายละเอียด</th> <th>-</th> </tr></thead>';
    htmlContent += '<tbody>';

    // Map the data and create table rows
    res.forEach((item, index) => {
      htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td> ${item.blackFullCaseName} <br /><span class="text-danger"> ${item.redFullCaseName} </span></td>
          <td class="text-start"> ข้อหา: ${item.alleDesc} <br /> โจทก์/ผู้ร้อง: ${item.prosDesc} <br /> คู่ความ: ${item.accuDesc}
          </td>
          <td>
          <button class="btn btn-primary" type="button" onclick="appoint_data('${item.caseId}')">ข้อมูลวันนัด</button>
          </td>
        </tr>
      `;
    });

// Close the table
htmlContent += '</tbody>';
htmlContent += '</table></div>';
    
    Swal.fire({
      width: '80%',
      showConfirmButton: false,
      allowOutsideClick: true,
      html: ` ${htmlContent} `,
    });

    document.getElementById('searchText').value = "";
  }

}

function createTableCell (text) {
  let cell = document.createElement("td");
  let cellText = document.createTextNode(text);
  cell.appendChild(cellText);
  return cell;
}

function createTableRow(obj, i) {
  let row = document.createElement("tr");

  let idCell = createTableCell(i + 1);
  row.appendChild(idCell);

  let caseCell = createTableCell(obj.fullCaseId);
  row.appendChild(caseCell);

  let descriptionCell = createTableCell();
  descriptionCell.innerHTML = `โจทก์: ${obj.prosDesc}<br>จำเลย: ${obj.accuDesc}`;
  row.appendChild(descriptionCell);

  let roomCell = createTableCell(obj.roomName);
  row.appendChild(roomCell);

  let reasonCell = createTableCell();
  let timeCell = obj.appointTime.substring(0, 5) + " น.";
  reasonCell.innerHTML = `${obj.reasonName}<br> เวลา : ${timeCell}`;
  row.appendChild(reasonCell);

  return row;
}

function generateTable(data) {
  let tbody = document.querySelector("#caseTable tbody");
  tbody.innerHTML = "";
  data.forEach((obj, i) => {
      let row = createTableRow(obj, i);
      tbody.appendChild(row);
  });
}

async function clearText() {
  document.getElementById('searchText').value = "";
  const data = await case_response() ;
  data.sort((a, b) => {
    const timeA = new Date(`1970-01-01T${a.appointTime}`);
    const timeB = new Date(`1970-01-01T${b.appointTime}`);
    return timeA - timeB;
  });
  generateTable(data);
}
